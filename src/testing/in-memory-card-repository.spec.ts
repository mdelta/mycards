import { aCard } from './card-builder';
import { InMemoryCardRepository } from './in-memory-card-repository';

describe('InMemoryCardRepository', () => {
  let repository: InMemoryCardRepository;

  beforeEach(() => {
    repository = new InMemoryCardRepository();
  });

  it('starts empty', async () => {
    expect(await repository.findAll()).toEqual([]);
  });

  it('can be seeded with cards', async () => {
    repository = new InMemoryCardRepository([aCard({ id: 'a' }), aCard({ id: 'b' })]);

    expect((await repository.findAll()).map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('saves and finds a card by id', async () => {
    const card = aCard({ id: 'a', storeName: 'Alpha' });

    await repository.save(card);

    expect(await repository.findById('a')).toEqual(card);
  });

  it('returns undefined for an unknown id', async () => {
    expect(await repository.findById('unknown')).toBeUndefined();
  });

  it('replaces a card with the same id', async () => {
    await repository.save(aCard({ id: 'a', storeName: 'Old' }));

    await repository.save(aCard({ id: 'a', storeName: 'New' }));

    const all = await repository.findAll();
    expect(all).toHaveLength(1);
    expect(all[0].storeName).toBe('New');
  });

  it('deletes a card', async () => {
    await repository.save(aCard({ id: 'a' }));

    await repository.delete('a');

    expect(await repository.findById('a')).toBeUndefined();
  });

  it('isolates stored cards from later mutation by the caller', async () => {
    const card = aCard({ id: 'a', tagIds: ['t1'] });
    await repository.save(card);

    card.storeName = 'Changed';
    card.tagIds.push('t2');
    const found = await repository.findById('a');
    found!.tagIds.push('t3');

    expect(await repository.findById('a')).toEqual(aCard({ id: 'a', tagIds: ['t1'] }));
  });
});
