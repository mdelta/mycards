import { BackupError } from '../model/backup-error';
import type { Card } from '../model/card';
import type { ArchiveCodec } from '../ports/archive-codec';
import type { BinaryFile } from '../ports/backup-files';
import type { CardRepository } from '../ports/card-repository';
import type { Clock } from '../ports/clock';

import { BACKUP_DOCUMENT_NAME, parseBackupDocument, serializeBackupDocument } from './backup-document';

/** Export and import in the own format (F-05, F-11, ADR-0004). */
export class BackupService {
  constructor(
    private readonly repository: CardRepository,
    private readonly archive: ArchiveCodec,
    private readonly clock: Clock,
  ) {}

  /** An empty password means no password. */
  async createBackup(password?: string): Promise<BinaryFile> {
    const now = this.clock.now();
    const json = serializeBackupDocument(await this.repository.findAll(), now);
    const data = await this.archive.pack(
      [{ name: BACKUP_DOCUMENT_NAME, data: new TextEncoder().encode(json) }],
      password || undefined,
    );
    return { name: `mycards-${now.slice(0, 10)}.zip`, data };
  }

  /** Reads and validates a backup without changing stored data; rejects with a `BackupError`. */
  async readBackup(data: Uint8Array, password?: string): Promise<Card[]> {
    const entries = await this.archive.unpack(data, password || undefined);
    const document = entries.find((entry) => entry.name === BACKUP_DOCUMENT_NAME);
    if (!document) {
      throw new BackupError('invalidContent');
    }
    return parseBackupDocument(decodeUtf8(document.data));
  }

  /** Overwrites cards with the same id; a clean import also deletes all other cards. */
  restoreBackup(cards: readonly Card[], options: { clean: boolean }): Promise<void> {
    return this.repository.saveAll(cards, { deleteOthers: options.clean });
  }
}

function decodeUtf8(data: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data);
  } catch {
    throw new BackupError('invalidContent');
  }
}
