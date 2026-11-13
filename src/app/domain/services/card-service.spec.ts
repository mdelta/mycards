import { aCard } from '../../../testing/card-builder';
import { InMemoryCardRepository } from '../../../testing/in-memory-card-repository';
import type { Clock } from '../ports/clock';
import type { IdGenerator } from '../ports/id-generator';

import { CardNotFoundError, CardService, InvalidCardError } from './card-service';

describe('CardService', () => {
  const NOW = '2026-03-01T10:00:00.000Z';
  const clock: Clock = { now: () => NOW };
  let nextId: number;
  const ids: IdGenerator = { newId: () => `id-${++nextId}` };
  let repository: InMemoryCardRepository;
  let service: CardService;

  beforeEach(() => {
    nextId = 0;
    repository = new InMemoryCardRepository();
    service = new CardService(repository, clock, ids);
  });

  describe('list', () => {
    it('returns cards favorites first and filtered by the query', async () => {
      repository = new InMemoryCardRepository([
        aCard({ id: 'a', storeName: 'Beta' }),
        aCard({ id: 'b', storeName: 'Alpha' }),
        aCard({ id: 'c', storeName: 'Zeta', favorite: true }),
      ]);
      service = new CardService(repository, clock, ids);

      expect((await service.list()).map((c) => c.id)).toEqual(['c', 'b', 'a']);
      expect((await service.list('eta')).map((c) => c.id)).toEqual(['c', 'a']);
    });
  });

  describe('create', () => {
    it('stores a normalized card with id, defaults and timestamps', async () => {
      const card = await service.create({ storeName: ' Store ', cardId: '123', barcodeType: 'QR_CODE' });

      expect(card).toEqual({
        id: 'id-1',
        storeName: 'Store',
        cardId: '123',
        barcodeType: 'QR_CODE',
        favorite: false,
        archived: false,
        showOnLockScreen: false,
        tagIds: [],
        createdAt: NOW,
        updatedAt: NOW,
      });
      expect(await repository.findById('id-1')).toEqual(card);
    });

    it('rejects an invalid draft without storing it', async () => {
      await expect(service.create({ storeName: '', cardId: '1' })).rejects.toEqual(
        new InvalidCardError(['storeNameRequired']),
      );
      expect(await repository.findAll()).toEqual([]);
    });
  });

  describe('update', () => {
    it('applies the draft, keeps other fields and refreshes updatedAt', async () => {
      const existing = aCard({ id: 'a', storeName: 'Old', note: 'keep?', color: '#ff0000', tagIds: ['t'] });
      await repository.save(existing);

      const updated = await service.update('a', { storeName: 'New', note: '' });

      expect(updated).toEqual({ ...existing, storeName: 'New', note: undefined, updatedAt: NOW });
      expect(await repository.findById('a')).toEqual(updated);
    });

    it('validates the merged card', async () => {
      await repository.save(aCard({ id: 'a' }));

      await expect(service.update('a', { cardId: ' ' })).rejects.toEqual(new InvalidCardError(['cardIdRequired']));
    });

    it('fails for an unknown card', async () => {
      await expect(service.update('missing', { storeName: 'X' })).rejects.toEqual(new CardNotFoundError('missing'));
    });
  });

  it('gets and deletes a card', async () => {
    await repository.save(aCard({ id: 'a' }));

    expect((await service.get('a'))?.id).toBe('a');
    await service.delete('a');
    expect(await service.get('a')).toBeUndefined();
  });

  it('records the last use without validating or touching updatedAt', async () => {
    await repository.save(aCard({ id: 'a', cardId: 'not-an-ean', barcodeType: 'EAN_13' }));

    await service.markUsed('a');
    await service.markUsed('missing');

    expect(await repository.findById('a')).toMatchObject({
      lastUsedAt: NOW,
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(await repository.findAll()).toHaveLength(1);
  });
});
