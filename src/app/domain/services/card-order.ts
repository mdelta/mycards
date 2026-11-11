import type { Card } from '../model/card';

/** Default card order: favorites first, then by store name (case-insensitive). */
export function compareCards(a: Card, b: Card): number {
  if (a.favorite !== b.favorite) {
    return a.favorite ? -1 : 1;
  }
  return a.storeName.localeCompare(b.storeName, undefined, { sensitivity: 'base' });
}
