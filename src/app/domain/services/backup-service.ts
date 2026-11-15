import { BackupError } from '../model/backup-error';
import type { ArchiveCodec } from '../ports/archive-codec';
import type { BinaryFile } from '../ports/backup-files';
import type { CardRepository } from '../ports/card-repository';
import type { Clock } from '../ports/clock';
import type { IdGenerator } from '../ports/id-generator';

import type { BackupContent } from './backup-document';
import { BACKUP_DOCUMENT_NAME, parseBackupDocument, serializeBackupDocument } from './backup-document';
import { mergeImportedTags } from './tag-merge';

/** Export and import in the own format (F-05, F-11, ADR-0004). */
export class BackupService {
  constructor(
    private readonly repository: CardRepository,
    private readonly archive: ArchiveCodec,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  /** An empty password means no password. */
  async createBackup(password?: string): Promise<BinaryFile> {
    const now = this.clock.now();
    const content = { cards: await this.repository.findAll(), tags: await this.repository.findAllTags() };
    const json = serializeBackupDocument(content, now);
    const data = await this.archive.pack(
      [{ name: BACKUP_DOCUMENT_NAME, data: new TextEncoder().encode(json) }],
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
    return parseBackupDocument(decodeUtf8(document.data));
  }

  /** Overwrites cards with the same id; a clean import also deletes all other cards and tags. */
  async restoreBackup(content: BackupContent, options: { clean: boolean }): Promise<void> {
    const { cards, tags } = options.clean
      ? content
      : mergeImportedTags(content, await this.repository.findAllTags(), () => this.ids.newId());
    await this.repository.saveAll(cards, { deleteOthers: options.clean, tags });
  }
}

function decodeUtf8(data: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data);
  } catch {
    throw new BackupError('invalidContent');
  }
}
