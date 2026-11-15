import type { Card } from '../model/card';
import type { ExternalLauncher } from '../ports/external-launcher';

/** Only web pages are opened from cards (F-06); other schemes could start arbitrary apps. */
export function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !!url.hostname;
  } catch {
    return false;
  }
}

/** Search term for the shop search (ADR-0005): the card's own term, else the store name. */
export function shopSearchTermOf(card: Pick<Card, 'storeName' | 'shopSearchTerm'>): string {
  return card.shopSearchTerm?.trim() || card.storeName.trim();
}

/** Opens the user's map app with a search near the current location; needs no location permission. */
export function mapSearchUri(term: string): string {
  return `geo:0,0?q=${encodeURIComponent(term)}`;
}

/** Fallback when no map app is installed: OpenStreetMap search in the browser. */
export function webMapSearchUrl(term: string): string {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(term)}`;
}

/** Opens the shop search in a map app, or in the browser if no map app is installed (ADR-0005). */
export async function openShopSearch(
  launcher: ExternalLauncher,
  card: Pick<Card, 'storeName' | 'shopSearchTerm'>,
): Promise<boolean> {
  const term = shopSearchTermOf(card);
  return (await launcher.open(mapSearchUri(term))) || launcher.open(webMapSearchUrl(term));
}
