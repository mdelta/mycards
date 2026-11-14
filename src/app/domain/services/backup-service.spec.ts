import { aCard } from '../../../testing/card-builder';
import { InMemoryCardRepository } from '../../../testing/in-memory-card-repository';
import { BackupError } from '../model/backup-error';
import type { ArchiveCodec } from '../ports/archive-codec';
import type { BinaryFile } from '../ports/backup-files';

import { BACKUP_DOCUMENT_NAME, serializeBackupDocument } from './backup-document';
import { BackupService } from './backup-service';

/** Keeps entries unencrypted in memory and records the password used. */
class FakeArchiveCodec implements ArchiveCodec {
  packed: { entries: BinaryFile[]; password?: string } | undefined;
  entries: BinaryFile[] = [];

  async pack(entries: BinaryFile[], password?: string): Promise<Uint8Array> {
    this.packed = { entries, password };
    return new Uint8Array([1, 2, 3]);
  }

  async unpack(): Promise<BinaryFile[]> {
    return this.entries;
  }
}

describe('BackupService', () => {
  const now = '2026-11-14T12:00:00.000Z';
  let repository: InMemoryCardRepository;
  let archive: FakeArchiveCodec;
  let service: BackupService;

  beforeEach(() => {
    repository = new InMemoryCardRepository([aCard({ id: 'a' }), aCard({ id: 'b', storeName: 'Bravo' })]);
    archive = new FakeArchiveCodec();
    service = new BackupService(repository, archive, { now: () => now });
  });

  function documentEntry(json: string): BinaryFile {
    return { name: BACKUP_DOCUMENT_NAME, data: new TextEncoder().encode(json) };
  }

  async function reasonOf(promise: Promise<unknown>): Promise<string | undefined> {
    try {
      await promise;
      return undefined;
    } catch (error) {
      return error instanceof BackupError ? error.reason : 'other';
    }
  }

  it('exports all cards as a dated ZIP file', async () => {
    const file = await service.createBackup();

    expect(file).toEqual({ name: 'mycards-2026-11-14.zip', data: new Uint8Array([1, 2, 3]) });
    expect(archive.packed?.password).toBeUndefined();
    expect(archive.packed?.entries.map((entry) => entry.name)).toEqual([BACKUP_DOCUMENT_NAME]);
    const document = JSON.parse(new TextDecoder().decode(archive.packed?.entries[0].data));
    expect(document.exportedAt).toBe(now);
    expect(document.cards.map((card: { id: string }) => card.id)).toEqual(['a', 'b']);
  });

  it('passes a password to the archive, but not an empty one', async () => {
    await service.createBackup('secret');
    expect(archive.packed?.password).toBe('secret');

    await service.createBackup('');
    expect(archive.packed?.password).toBeUndefined();
  });

  it('reads the cards of a backup without changing stored cards', async () => {
    archive.entries = [
      { name: 'other.txt', data: new Uint8Array() },
      documentEntry(serializeBackupDocument([aCard({ id: 'x' })], now)),
    ];

    expect(await service.readBackup(new Uint8Array())).toEqual([aCard({ id: 'x' })]);
    expect((await repository.findAll()).map((card) => card.id)).toEqual(['a', 'b']);
  });

  it('rejects an archive without the backup document', async () => {
    archive.entries = [{ name: 'catima.csv', data: new Uint8Array() }];

    expect(await reasonOf(service.readBackup(new Uint8Array()))).toBe('invalidContent');
  });

  it('rejects a document that is not UTF-8', async () => {
    archive.entries = [{ name: BACKUP_DOCUMENT_NAME, data: new Uint8Array([0xff, 0xfe]) }];

    expect(await reasonOf(service.readBackup(new Uint8Array()))).toBe('invalidContent');
  });

  it('normal import overwrites cards with the same id and keeps the others', async () => {
    await service.restoreBackup([aCard({ id: 'b', storeName: 'New' }), aCard({ id: 'c' })], { clean: false });

    expect((await repository.findAll()).map((card) => [card.id, card.storeName])).toEqual([
      ['a', 'Store'],
      ['b', 'New'],
      ['c', 'Store'],
    ]);
  });

  it('clean import deletes all other cards', async () => {
    await service.restoreBackup([aCard({ id: 'c' })], { clean: true });

    expect((await repository.findAll()).map((card) => card.id)).toEqual(['c']);
  });
});
