import { aCard } from '../../../testing/card-builder';

import { filterCards } from './card-filter';

describe('filterCards', () => {
  const cards = [
    aCard({ id: '1', storeName: 'Bakery Müller', cardId: '111', note: 'bread' }),
    aCard({ id: '2', storeName: 'Pharmacy', cardId: '4711' }),
    aCard({ id: '3', storeName: 'Garden Center', cardId: '999', note: 'Plants and more' }),
  ];

  it('returns all cards for an empty or blank query', () => {
    expect(filterCards(cards, '')).toEqual(cards);
    expect(filterCards(cards, '   ')).toEqual(cards);
  });

  it('matches store name, card ID and note case-insensitively', () => {
    expect(filterCards(cards, 'müller').map((c) => c.id)).toEqual(['1']);
    expect(filterCards(cards, '471').map((c) => c.id)).toEqual(['2']);
    expect(filterCards(cards, 'PLANTS').map((c) => c.id)).toEqual(['3']);
  });

  it('ignores surrounding whitespace in the query', () => {
    expect(filterCards(cards, ' pharmacy ').map((c) => c.id)).toEqual(['2']);
  });

  it('returns nothing if no card matches', () => {
    expect(filterCards(cards, 'xyz')).toEqual([]);
  });
});
