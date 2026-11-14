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
    color: '#FFF44336',
    icon: 'cart',
    favorite: true,
    archived: true,
    showOnLockScreen: true,
    homepageUrl: 'https://example.com',
    shopSearchTerm: 'Store Berlin',
    tagIds: ['t2', 't1'],
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
});
