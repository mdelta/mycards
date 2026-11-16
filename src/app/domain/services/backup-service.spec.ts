import { aCard } from '../../../testing/card-builder';
import { InMemoryCardRepository } from '../../../testing/in-memory-card-repository';
import { InMemoryPhotoStore } from '../../../testing/in-memory-photo-store';
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
  const images = {
    resize: vi.fn(async (_image: Uint8Array, _maxEdge: number, _quality: number) => new Uint8Array([7])),
    cropSquare: vi.fn(async (_image: Uint8Array, _size: number, _quality: number) => new Uint8Array([8])),
    toPng: vi.fn(async (_image: Uint8Array) => new Uint8Array([9])),
  };
  const now = '2026-11-14T12:00:00.000Z';
  let repository: InMemoryCardRepository;
  let archive: FakeArchiveCodec;
  let service: BackupService;
  let photos: InMemoryPhotoStore;

  beforeEach(() => {
    repository = new InMemoryCardRepository([aCard({ id: 'a' }), aCard({ id: 'b', storeName: 'Bravo' })]);
    archive = new FakeArchiveCodec();
    photos = new InMemoryPhotoStore();
    service = new BackupService(repository, archive, { now: () => now }, { newId: () => 'new-id' }, photos, images);
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
      documentEntry(serializeBackupDocument({ cards: [aCard({ id: 'x' })], tags: [] }, now)),
    ];

    expect(await service.readBackup(new Uint8Array())).toEqual({
      cards: [aCard({ id: 'x' })],
      tags: [],
      photos: new Map(),
      format: 'mycards',
    });
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
    await service.restoreBackup(
      { cards: [aCard({ id: 'b', storeName: 'New' }), aCard({ id: 'c' })], tags: [] },
      { clean: false },
    );

    expect((await repository.findAll()).map((card) => [card.id, card.storeName])).toEqual([
      ['a', 'Store'],
      ['b', 'New'],
      ['c', 'Store'],
    ]);
  });

  it('clean import deletes all other cards', async () => {
    await service.restoreBackup({ cards: [aCard({ id: 'c' })], tags: [] }, { clean: true });

    expect((await repository.findAll()).map((card) => card.id)).toEqual(['c']);
  });

  it('exports tags with the cards', async () => {
    repository = new InMemoryCardRepository([aCard({ id: 'a', tagIds: ['t1'] })], [{ id: 't1', name: 'Food' }]);
    service = new BackupService(repository, archive, { now: () => now }, { newId: () => 'new-id' }, photos, images);

    await service.createBackup();

    const json = JSON.parse(new TextDecoder().decode(archive.packed!.entries[0].data));
    expect(json.tags).toEqual([{ id: 't1', name: 'Food' }]);
    expect(json.cards[0].tagIds).toEqual(['t1']);
  });

  it('normal import reuses existing tags with the same name', async () => {
    repository = new InMemoryCardRepository([aCard({ id: 'a', tagIds: ['t1'] })], [{ id: 't1', name: 'Food' }]);
    service = new BackupService(repository, archive, { now: () => now }, { newId: () => 'new-id' }, photos, images);

    await service.restoreBackup(
      {
        cards: [aCard({ id: 'b', tagIds: ['x', 't1'] })],
        tags: [
          { id: 'x', name: 'FOOD' },
          { id: 't1', name: 'Drugstore' },
        ],
      },
      { clean: false },
    );

    expect(await repository.findAllTags()).toEqual([
      { id: 't1', name: 'Food' },
      { id: 'new-id', name: 'Drugstore' },
    ]);
    expect((await repository.findById('b'))?.tagIds).toEqual(['t1', 'new-id']);
  });

  it('clean import replaces all tags', async () => {
    repository = new InMemoryCardRepository([aCard({ id: 'a', tagIds: ['t1'] })], [{ id: 't1', name: 'Food' }]);
    service = new BackupService(repository, archive, { now: () => now }, { newId: () => 'new-id' }, photos, images);

    await service.restoreBackup(
      { cards: [aCard({ id: 'b', tagIds: ['t2'] })], tags: [{ id: 't2', name: 'Food' }] },
      { clean: true },
    );

    expect(await repository.findAllTags()).toEqual([{ id: 't2', name: 'Food' }]);
  });

  describe('photos', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 1]);

    function useCards(...cards: ReturnType<typeof aCard>[]): void {
      repository = new InMemoryCardRepository(cards);
      service = new BackupService(repository, archive, { now: () => now }, { newId: () => 'new-id' }, photos, images);
    }

    it('exports photo files next to the document', async () => {
      photos = new InMemoryPhotoStore({ p1: jpeg });
      useCards(aCard({ id: 'a', photos: [{ id: 'p1', role: 'front' }] }));

      await service.createBackup();

      expect(archive.packed?.entries.map((entry) => entry.name)).toEqual([BACKUP_DOCUMENT_NAME, 'photos/p1.jpg']);
      expect(archive.packed?.entries[1].data).toEqual(jpeg);
    });

    it('leaves out photos whose file is missing', async () => {
      useCards(aCard({ id: 'a', photos: [{ id: 'gone', role: 'front' }] }));

      await service.createBackup();

      const json = JSON.parse(new TextDecoder().decode(archive.packed!.entries[0].data));
      expect(json.cards[0].photos).toEqual([]);
      expect(archive.packed?.entries).toHaveLength(1);
    });

    it('reads the photo files of a backup', async () => {
      const card = aCard({ id: 'x', photos: [{ id: 'p1', role: 'back' }] });
      archive.entries = [
        documentEntry(serializeBackupDocument({ cards: [card], tags: [] }, now)),
        { name: 'photos/p1.jpg', data: jpeg },
      ];

      expect((await service.readBackup(new Uint8Array())).photos).toEqual(new Map([['p1', jpeg]]));
    });

    it('rejects a backup that lacks a referenced photo file', async () => {
      const card = aCard({ id: 'x', photos: [{ id: 'p1', role: 'back' }] });
      archive.entries = [documentEntry(serializeBackupDocument({ cards: [card], tags: [] }, now))];

      expect(await reasonOf(service.readBackup(new Uint8Array()))).toBe('invalidContent');
    });

    it('writes imported photo files and deletes files no card uses any more', async () => {
      photos = new InMemoryPhotoStore({ old: jpeg });
      useCards(aCard({ id: 'a', photos: [{ id: 'old', role: 'front' }] }));
      const imported = aCard({ id: 'b', photos: [{ id: 'new', role: 'front' }] });

      await service.restoreBackup({ cards: [imported], tags: [], photos: new Map([['new', jpeg]]) }, { clean: true });

      expect(await photos.list()).toEqual(['new']);
    });

    it('gives an imported photo a new id instead of overwriting a stored file', async () => {
      const old = new Uint8Array([1]);
      photos = new InMemoryPhotoStore({ p1: old });
      useCards(aCard({ id: 'a', photos: [{ id: 'p1', role: 'front' }] }));
      const imported = aCard({ id: 'b', photos: [{ id: 'p1', role: 'back' }] });

      await service.restoreBackup({ cards: [imported], tags: [], photos: new Map([['p1', jpeg]]) }, { clean: false });

      expect((await repository.findById('b'))?.photos).toEqual([{ id: 'new-id', role: 'back' }]);
      expect(await photos.read('p1')).toEqual(old);
      expect(await photos.read('new-id')).toEqual(jpeg);
    });

    it('leaves stored photos untouched when the import fails', async () => {
      const old = new Uint8Array([1]);
      photos = new InMemoryPhotoStore({ p1: old });
      useCards(aCard({ id: 'a', photos: [{ id: 'p1', role: 'front' }] }));
      vi.spyOn(repository, 'saveAll').mockRejectedValueOnce(new Error('disk full'));
      const imported = aCard({ id: 'a', photos: [{ id: 'p1', role: 'front' }] });

      await expect(
        service.restoreBackup({ cards: [imported], tags: [], photos: new Map([['p1', jpeg]]) }, { clean: true }),
      ).rejects.toThrow('disk full');

      expect(await photos.read('p1')).toEqual(old);
      expect((await repository.findById('a'))?.photos).toEqual([{ id: 'p1', role: 'front' }]);
    });
  });

  describe('Catima format', () => {
    const header =
      '_id,store,note,validfrom,expiry,balance,balancetype,cardid,barcodeid,barcodetype,barcodeencoding,headercolor,starstatus,lastused,archive';
    const csv = (cards: string[]): Uint8Array =>
      new TextEncoder().encode(['2', '', '_id', '', header, ...cards, '', 'cardId,groupId', ''].join('\r\n'));
    const png = new Uint8Array([0x89, 0x50]);

    beforeEach(() => {
      let n = 0;
      service = new BackupService(repository, archive, { now: () => now }, { newId: () => `id${++n}` }, photos, images);
      vi.clearAllMocks();
    });

    it('reads a Catima export and shrinks its photos', async () => {
      archive.entries = [
        { name: 'catima.csv', data: csv(['1,Bakery,,,,0,,111,,QR_CODE,UTF-8,-769226,0,0,0']) },
        { name: 'card_1_front.png', data: png },
        { name: 'card_1_icon.png', data: png },
      ];

      const content = await service.readBackup(new Uint8Array());

      expect(content.format).toBe('catima');
      expect(content.cards.map((card) => [card.storeName, card.photos])).toEqual([
        [
          'Bakery',
          [
            { id: 'id1', role: 'front' },
            { id: 'id2', role: 'icon' },
          ],
        ],
      ]);
      expect(images.resize).toHaveBeenCalledWith(png, 1600, 0.8);
      expect(images.cropSquare).toHaveBeenCalledWith(png, 256, 0.8);
      expect(content.photos).toEqual(
        new Map([
          ['id1', new Uint8Array([7])],
          ['id2', new Uint8Array([8])],
        ]),
      );
    });

    it('imports the card without a photo that cannot be decoded', async () => {
      images.resize.mockRejectedValueOnce(new Error('decode failed'));
      archive.entries = [
        { name: 'catima.csv', data: csv(['1,Bakery,,,,0,,111,,,UTF-8,-769226,0,0,0']) },
        { name: 'card_1_back.png', data: png },
      ];

      const content = await service.readBackup(new Uint8Array());

      expect(content.cards[0].photos).toEqual([]);
      expect(content.photos?.size).toBe(0);
    });

    it('rejects an archive with neither a MyCards nor a Catima document', async () => {
      archive.entries = [{ name: 'other.csv', data: new Uint8Array() }];

      expect(await reasonOf(service.readBackup(new Uint8Array()))).toBe('invalidContent');
    });

    it('adds Catima cards as new cards on a normal import', async () => {
      archive.entries = [{ name: 'catima.csv', data: csv(['1,Bakery,,,,0,,111,,,UTF-8,-769226,0,0,0']) }];

      await service.restoreBackup(await service.readBackup(new Uint8Array()), { clean: false });

      expect((await repository.findAll()).map((card) => card.storeName)).toEqual(['Store', 'Bravo', 'Bakery']);
    });

    it('exports a Catima file with PNG photos', async () => {
      photos = new InMemoryPhotoStore({ p1: new Uint8Array([1]), p2: new Uint8Array([2]) });
      repository = new InMemoryCardRepository(
        [
          aCard({
            id: 'a',
            storeName: 'Alpha',
            tagIds: ['t1'],
            photos: [
              { id: 'p1', role: 'back' },
              { id: 'p2', role: 'other' },
              { id: 'gone', role: 'front' },
            ],
          }),
        ],
        [{ id: 't1', name: 'Food' }],
      );
      service = new BackupService(repository, archive, { now: () => now }, { newId: () => 'x' }, photos, images);

      const file = await service.createBackup('secret', 'catima');

      expect(file.name).toBe('catima_20261114.zip');
      expect(archive.packed?.password).toBe('secret');
      expect(archive.packed?.entries.map((entry) => entry.name)).toEqual(['catima.csv', 'card_1_back.png']);
      expect(images.toPng).toHaveBeenCalledWith(new Uint8Array([1]));
      const text = new TextDecoder().decode(archive.packed!.entries[0].data);
      expect(text).toContain('\r\n_id\r\nFood\r\n');
      expect(text).toContain('cardId,groupId\r\n1,Food\r\n');
    });

    it('lists the fields a Catima export would lose', async () => {
      repository = new InMemoryCardRepository([aCard({ homepageUrl: 'https://a.de', showOnLockScreen: true })]);
      service = new BackupService(repository, archive, { now: () => now }, { newId: () => 'x' }, photos, images);

      expect(await service.catimaLosses()).toEqual(['homepage', 'lockScreen']);
    });
  });
});
