import { aCard } from '../../../testing/card-builder';
import type { SqlJsDatabase } from '../../../testing/sql-js-database';
import { createTestDatabase } from '../../../testing/sql-js-database';
import type { Card } from '../../domain/model/card';

import { SqliteCardRepository } from './sqlite-card-repository';

describe('SqliteCardRepository', () => {
  let db: SqlJsDatabase;
  let repository: SqliteCardRepository;

  const fullCard: Card = aCard({
    id: 'full',
    storeName: 'Store',
    cardId: '4006381333931',
    barcodeValue: '04006381333931',
    barcodeType: 'EAN_13',
    note: 'note',
    validFrom: '2026-01-01',
    expiry: '2027-01-01',
    balance: 1.23,
    balanceType: 'EUR',
    color: '#F44336',
    icon: 'cart',
    favorite: true,
    archived: true,
    showOnLockScreen: true,
    homepageUrl: 'https://example.com',
    shopSearchTerm: 'Store Berlin',
    tagIds: ['t2', 't1'],
    websites: [{ label: 'Shop', url: 'https://shop.example.com' }, { url: 'https://example.org' }],
    photos: [
      { id: 'p-back', role: 'back' },
      { id: 'p-front', role: 'front' },
      { id: 'p-other', role: 'other' },
    ],
    lastUsedAt: '2026-02-01T00:00:00.000Z',
  });

  beforeEach(async () => {
    db = await createTestDatabase();
    await db.run("INSERT INTO tag (id, name) VALUES ('t1', 'Food'), ('t2', 'Drugstore')");
    repository = new SqliteCardRepository(db);
  });

  it('round-trips a card with all fields', async () => {
    await repository.save(fullCard);

    expect(await repository.findById('full')).toEqual(fullCard);
    expect(await repository.findAll()).toEqual([fullCard]);
  });

  it('round-trips a minimal card without adding undefined keys', async () => {
    const minimal = aCard({ id: 'min' });

    await repository.save(minimal);

    expect(await repository.findById('min')).toStrictEqual(minimal);
  });

  it('updates only the last-used timestamp', async () => {
    await repository.save(fullCard);

    await repository.updateLastUsed('full', '2026-05-05T00:00:00.000Z');
    await repository.updateLastUsed('missing', '2026-05-05T00:00:00.000Z');

    expect(await repository.findById('full')).toEqual({ ...fullCard, lastUsedAt: '2026-05-05T00:00:00.000Z' });
    expect(await repository.findAll()).toHaveLength(1);
  });

  it('returns undefined for an unknown id', async () => {
    expect(await repository.findById('missing')).toBeUndefined();
  });

  it('replaces an existing card including its tags', async () => {
    await repository.save(fullCard);
    const changed: Card = { ...aCard({ id: 'full', storeName: 'Renamed' }), tagIds: ['t1'] };

    await repository.save(changed);

    expect(await repository.findAll()).toEqual([changed]);
  });

  it('deletes a card with its tags, websites and photos', async () => {
    await repository.save(fullCard);
    await repository.save(aCard({ id: 'other', tagIds: ['t1'] }));
    await db.run("INSERT INTO website (id, card_id, url) VALUES ('w', 'full', 'https://example.com/a')");
    await db.run("INSERT INTO photo (id, card_id, role, file_ref) VALUES ('p', 'full', 'front', 'photos/p.jpg')");

    await repository.delete('full');

    expect((await repository.findAll()).map((c) => c.id)).toEqual(['other']);
    expect(await db.query('SELECT card_id FROM card_tag')).toEqual([{ card_id: 'other' }]);
    expect(await db.query('SELECT * FROM website')).toEqual([]);
    expect(await db.query('SELECT * FROM photo')).toEqual([]);
  });

  it('keeps the previous state if saving fails', async () => {
    await repository.save(aCard({ id: 'a', tagIds: ['t1'] }));

    await expect(repository.save(aCard({ id: 'a', storeName: 'New', tagIds: ['unknown-tag'] }))).rejects.toThrow();

    expect(await repository.findById('a')).toEqual(aCard({ id: 'a', tagIds: ['t1'] }));
  });

  describe('saveAll', () => {
    beforeEach(async () => {
      await repository.save(aCard({ id: 'kept', tagIds: ['t1'] }));
      await repository.save(aCard({ id: 'replaced', storeName: 'Old', tagIds: ['t1'] }));
      await db.run("INSERT INTO website (id, card_id, url) VALUES ('w', 'kept', 'https://example.com/a')");
    });

    it('replaces cards with the same id and keeps the others', async () => {
      await repository.saveAll([aCard({ id: 'replaced', storeName: 'New', tagIds: ['t2'] }), aCard({ id: 'added' })], {
        tags: [{ id: 't2', name: 'Drugstore' }],
      });

      expect(await repository.findAll()).toEqual(
        expect.arrayContaining([
          aCard({ id: 'kept', tagIds: ['t1'], websites: [{ url: 'https://example.com/a' }] }),
          aCard({ id: 'replaced', storeName: 'New', tagIds: ['t2'] }),
          aCard({ id: 'added' }),
        ]),
      );
      expect(await db.query('SELECT card_id FROM website')).toEqual([{ card_id: 'kept' }]);
    });

    it('deletes all other cards with their related rows when asked to', async () => {
      await repository.saveAll([aCard({ id: 'replaced', storeName: 'New' })], { deleteOthers: true });

      expect(await repository.findAll()).toEqual([aCard({ id: 'replaced', storeName: 'New' })]);
      expect(await db.query('SELECT * FROM card_tag')).toEqual([]);
      expect(await db.query('SELECT * FROM website')).toEqual([]);
    });

    it('changes nothing if one card fails', async () => {
      await expect(
        repository.saveAll([aCard({ id: 'added' }), aCard({ id: 'bad', tagIds: ['unknown-tag'] })], {
          deleteOthers: true,
        }),
      ).rejects.toThrow();

      expect((await repository.findAll()).map((c) => c.id).sort()).toEqual(['kept', 'replaced']);
    });
  });

  describe('tags and websites', () => {
    it('keeps the order of websites and replaces them on save', async () => {
      await repository.save(fullCard);
      await repository.save({ ...fullCard, websites: [{ url: 'https://new.example.com' }] });

      expect((await repository.findById('full'))?.websites).toEqual([{ url: 'https://new.example.com' }]);
      expect((await repository.findAll())[0].websites).toEqual([{ url: 'https://new.example.com' }]);
    });

    it('keeps the order of photos and replaces them on save', async () => {
      await repository.save(fullCard);
      await repository.save({ ...fullCard, photos: [{ id: 'p-icon', role: 'icon' }] });

      expect((await repository.findById('full'))?.photos).toEqual([{ id: 'p-icon', role: 'icon' }]);
      expect((await repository.findAll())[0].photos).toEqual([{ id: 'p-icon', role: 'icon' }]);
    });

    it('creates and renames tags', async () => {
      await repository.saveTag({ id: 't3', name: 'Cinema' });
      await repository.saveTag({ id: 't3', name: 'Movies' });

      expect(await repository.findAllTags()).toContainEqual({ id: 't3', name: 'Movies' });
    });

    it('deletes tags that no card uses after a write', async () => {
      await repository.save(aCard({ id: 'a', tagIds: ['t1'] }));

      expect(await repository.findAllTags()).toEqual([{ id: 't1', name: 'Food' }]);

      await repository.delete('a');

      expect(await repository.findAllTags()).toEqual([]);
    });

    it('saves imported tags with the cards', async () => {
      await repository.saveAll([aCard({ id: 'a', tagIds: ['t9'] })], { tags: [{ id: 't9', name: 'Imported' }] });

      expect((await repository.findById('a'))?.tagIds).toEqual(['t9']);
      expect(await repository.findAllTags()).toEqual([{ id: 't9', name: 'Imported' }]);
    });

    it('replaces all tags on a clean import', async () => {
      await repository.save(aCard({ id: 'a', tagIds: ['t1'] }));
      await repository.saveAll([aCard({ id: 'b', tagIds: ['t9'] })], {
        deleteOthers: true,
        tags: [{ id: 't9', name: 'Food' }],
      });

      expect(await repository.findAllTags()).toEqual([{ id: 't9', name: 'Food' }]);
    });
  });
});
