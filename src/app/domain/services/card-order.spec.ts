import type { Card } from '../model/card';

import { compareCards } from './card-order';

function card(storeName: string, favorite = false): Card {
  return {
    id: storeName,
    storeName,
    cardId: '1',
    favorite,
    archived: false,
    showOnLockScreen: false,
    tagIds: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

describe('compareCards', () => {
  it('puts favorites first, then sorts by store name ignoring case', () => {
    const cards = [card('beta'), card('Zeta', true), card('alpha'), card('Gamma', true)];

    const names = [...cards].sort(compareCards).map((c) => c.storeName);

    expect(names).toEqual(['Gamma', 'Zeta', 'alpha', 'beta']);
  });
});
