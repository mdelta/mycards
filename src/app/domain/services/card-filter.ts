import type { Card } from '../model/card';

/** Case-insensitive search over store name, card ID and note. */
export function filterCards(cards: Card[], query: string): Card[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) {
    return cards;
  }
  return cards.filter((card) =>
    [card.storeName, card.cardId, card.note].some((value) => value?.toLocaleLowerCase().includes(needle)),
  );
}
