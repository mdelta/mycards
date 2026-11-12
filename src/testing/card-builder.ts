import type { Card } from '../app/domain/model/card';

/** Test data builder: a valid minimal card, overridable per test. */
export function aCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card-1',
    storeName: 'Store',
    cardId: '123456',
    favorite: false,
    archived: false,
    showOnLockScreen: false,
    tagIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}
