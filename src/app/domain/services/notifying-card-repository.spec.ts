import { aCard } from '../../../testing/card-builder';
import { InMemoryCardRepository } from '../../../testing/in-memory-card-repository';

import { NotifyingCardRepository } from './notifying-card-repository';

describe('NotifyingCardRepository', () => {
  let inner: InMemoryCardRepository;
  const onChange = vi.fn();
  let repository: NotifyingCardRepository;

  beforeEach(() => {
    onChange.mockClear();
    inner = new InMemoryCardRepository([aCard({ id: 'a' })]);
    repository = new NotifyingCardRepository(inner, onChange);
  });

  it('notifies after saving, deleting and importing cards', async () => {
    await repository.save(aCard({ id: 'b' }));
    await repository.delete('a');
    await repository.saveAll([aCard({ id: 'c' })], { deleteOthers: true });

    expect(onChange).toHaveBeenCalledTimes(3);
    expect((await repository.findAll()).map((card) => card.id)).toEqual(['c']);
  });

  it('does not notify for reads, last-used times and tags', async () => {
    await repository.updateLastUsed('a', '2026-02-01T00:00:00.000Z');
    await repository.saveTag({ id: 't', name: 'Food' });

    expect(await repository.findById('a')).toMatchObject({ lastUsedAt: '2026-02-01T00:00:00.000Z' });
    expect(await repository.findAllTags()).toEqual([{ id: 't', name: 'Food' }]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not notify when a write fails', async () => {
    vi.spyOn(inner, 'save').mockRejectedValueOnce(new Error('locked'));

    await expect(repository.save(aCard())).rejects.toThrow('locked');
    expect(onChange).not.toHaveBeenCalled();
  });
});
