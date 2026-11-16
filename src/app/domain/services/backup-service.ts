import { BackupError } from '../model/backup-error';
import type { ArchiveCodec } from '../ports/archive-codec';
import type { BinaryFile } from '../ports/backup-files';
import type { CardRepository } from '../ports/card-repository';
import type { Clock } from '../ports/clock';
import type { IdGenerator } from '../ports/id-generator';
import type { PhotoStore } from '../ports/photo-store';

import type { BackupContent } from './backup-document';
import { BACKUP_DOCUMENT_NAME, parseBackupDocument, photoEntryName, serializeBackupDocument } from './backup-document';
import { pruneUnusedPhotos } from './photo-service';
import { mergeImportedTags } from './tag-merge';

/** Export and import in the own format (F-05, F-11, ADR-0004). */
export class BackupService {
  constructor(
    private readonly repository: CardRepository,
    private readonly archive: ArchiveCodec,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly photos: PhotoStore,
  ) {}

  /** An empty password means no password. */
  async createBackup(password?: string): Promise<BinaryFile> {
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
      throw new BackupError('invalidContent');
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
    return { ...content, photos };
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
