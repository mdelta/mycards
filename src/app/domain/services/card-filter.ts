import type { Card } from '../model/card';

/** Case-insensitive search over store name, card ID and note; optionally only cards with `tagId`. */
export function filterCards(cards: Card[], query: string, tagId?: string): Card[] {
  const needle = query.trim().toLocaleLowerCase();
  return cards.filter(
    (card) =>
      (!tagId || card.tagIds.includes(tagId)) &&
      (!needle ||
        [card.storeName, card.cardId, card.note].some((value) => value?.toLocaleLowerCase().includes(needle))),
  );
}
