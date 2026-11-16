import { BackupError } from '../model/backup-error';
import { ICON_IMAGE_SIZE, JPEG_QUALITY, PHOTO_MAX_EDGE } from '../model/photo';
import type { ArchiveCodec } from '../ports/archive-codec';
import type { BinaryFile } from '../ports/backup-files';
import type { CardRepository } from '../ports/card-repository';
import type { Clock } from '../ports/clock';
import type { IdGenerator } from '../ports/id-generator';
import type { ImageProcessor } from '../ports/image-processor';
import type { PhotoStore } from '../ports/photo-store';

import type { BackupContent } from './backup-document';
import { BACKUP_DOCUMENT_NAME, parseBackupDocument, photoEntryName, serializeBackupDocument } from './backup-document';
import type { CatimaLoss } from './catima-format';
import { CATIMA_DOCUMENT_NAME, catimaLosses, fromCatima, parseCatimaCsv, toCatima } from './catima-format';
import { pruneUnusedPhotos } from './photo-service';
import { mergeImportedTags } from './tag-merge';

export type BackupFormat = 'mycards' | 'catima';

/** Export and import in the own format and the Catima format (F-05, F-11, ADR-0004). */
export class BackupService {
  constructor(
    private readonly repository: CardRepository,
    private readonly archive: ArchiveCodec,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly photos: PhotoStore,
    private readonly images: ImageProcessor,
  ) {}

  /** An empty password means no password. */
  async createBackup(password?: string, format: BackupFormat = 'mycards'): Promise<BinaryFile> {
    if (format === 'catima') {
      return this.createCatimaExport(password);
    }
    const now = this.clock.now();
    const files: BinaryFile[] = [];
    const cards = [];
    for (const card of await this.repository.findAll()) {
      const photos = [];
      for (const photo of card.photos) {
        const data = await this.photos.read(photo.id);
        // A missing file (e.g. removed outside the app) must not make the backup unreadable.
        if (data) {
          photos.push(photo);
          files.push({ name: photoEntryName(photo.id), data });
        }
      }
      cards.push({ ...card, photos });
    }
    const json = serializeBackupDocument({ cards, tags: await this.repository.findAllTags() }, now);
    const data = await this.archive.pack(
      [{ name: BACKUP_DOCUMENT_NAME, data: new TextEncoder().encode(json) }, ...files],
      password || undefined,
    );
    return { name: `mycards-${now.slice(0, 10)}.zip`, data };
  }

  /** Reads and validates a backup without changing stored data; rejects with a `BackupError`. */
  async readBackup(data: Uint8Array, password?: string): Promise<BackupContent> {
    const entries = await this.archive.unpack(data, password || undefined);
    const document = entries.find((entry) => entry.name === BACKUP_DOCUMENT_NAME);
    if (!document) {
      return this.readCatima(entries);
    }
    const content = parseBackupDocument(decodeUtf8(document.data));
    const files = new Map(entries.map((entry) => [entry.name, entry.data]));
    const photos = new Map<string, Uint8Array>();
    for (const photo of content.cards.flatMap((card) => card.photos)) {
      const data = files.get(photoEntryName(photo.id));
      if (!data) {
        throw new BackupError('invalidContent');
      }
      photos.set(photo.id, data);
    }
    return { ...content, photos, format: 'mycards' };
  }

  /** MyCards fields that a Catima export would lose. */
  async catimaLosses(): Promise<CatimaLoss[]> {
    return catimaLosses(await this.repository.findAll());
  }

  private async createCatimaExport(password?: string): Promise<BinaryFile> {
    const { csv, photos } = toCatima(await this.repository.findAll(), await this.repository.findAllTags());
    const files: BinaryFile[] = [{ name: CATIMA_DOCUMENT_NAME, data: new TextEncoder().encode(csv) }];
    for (const photo of photos) {
      const data = await this.photos.read(photo.id);
      if (data) {
        files.push({ name: photo.entry, data: await this.images.toPng(data) });
      }
    }
    const date = this.clock.now().slice(0, 10).replaceAll('-', '');
    return { name: `catima_${date}.zip`, data: await this.archive.pack(files, password || undefined) };
  }

  /** Catima photos are full-size PNGs; they are shrunk like photos taken in MyCards (ADR-0003). */
  private async readCatima(entries: BinaryFile[]): Promise<BackupContent> {
    const document = entries.find((entry) => entry.name === CATIMA_DOCUMENT_NAME);
    if (!document) {
      throw new BackupError('invalidContent');
    }
    const files = new Map(entries.map((entry) => [entry.name, entry.data]));
    const imported = fromCatima(
      parseCatimaCsv(decodeUtf8(document.data)),
      new Set(files.keys()),
      this.clock.now(),
      () => this.ids.newId(),
    );
    const photos = new Map<string, Uint8Array>();
    for (const [id, { entry, role }] of imported.photoEntries) {
      const image = files.get(entry)!;
      try {
        photos.set(
          id,
          role === 'icon'
            ? await this.images.cropSquare(image, ICON_IMAGE_SIZE, JPEG_QUALITY)
            : await this.images.resize(image, PHOTO_MAX_EDGE, JPEG_QUALITY),
        );
      } catch {
        // An unreadable image must not block the import of the card itself.
      }
    }
    const cards = imported.content.cards.map((card) => ({
      ...card,
      photos: card.photos.filter((photo) => photos.has(photo.id)),
    }));
    return {
      ...imported.content,
      cards,
      photos,
      format: 'catima',
      unsupportedBarcodes: imported.unsupportedBarcodes,
    };
  }

  /** Overwrites cards with the same id; a clean import also deletes all other cards, tags and photos. */
  async restoreBackup(content: BackupContent, options: { clean: boolean }): Promise<void> {
    const imported = await this.writeImportedPhotos(content);
    const { cards, tags } = options.clean
      ? imported
      : mergeImportedTags(imported, await this.repository.findAllTags(), () => this.ids.newId());
    await this.repository.saveAll(cards, { deleteOthers: options.clean, tags });
    await pruneUnusedPhotos(this.repository, this.photos);
  }

  /**
   * Photo files are never overwritten (ADR-0003): an imported photo whose id is already stored gets a
   * new id. So a failed import leaves stored photos untouched, and cached images stay valid.
   */
  private async writeImportedPhotos(content: BackupContent): Promise<BackupContent> {
    const stored = new Set(await this.photos.list());
    const cards = [];
    for (const card of content.cards) {
      const photos = [];
      for (const photo of card.photos) {
        const id = stored.has(photo.id) ? this.ids.newId() : photo.id;
        await this.photos.write(id, content.photos?.get(photo.id) ?? new Uint8Array());
        photos.push({ ...photo, id });
      }
      cards.push({ ...card, photos });
    }
    return { ...content, cards };
  }
}

function decodeUtf8(data: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data);
  } catch {
    throw new BackupError('invalidContent');
  }
}
