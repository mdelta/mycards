/**
 * Card colors offered in the editor (ADR-0016). All have a contrast ratio of at least 4.5:1 to white
 * text, so the store's initial or icon stays readable.
 */
export const CARD_COLORS = [
  '#C62828',
  '#AD1457',
  '#6A1B9A',
  '#4527A0',
  '#283593',
  '#1565C0',
  '#00695C',
  '#2E7D32',
  '#33691E',
  '#BF360C',
  '#4E342E',
  '#37474F',
] as const;

const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function isCardColor(value: string): boolean {
  return COLOR_PATTERN.test(value);
}

/** The card's own color, or a palette color derived from the store name so it stays stable. */
export function cardColorOf(card: { color?: string; storeName: string }): string {
  if (card.color) {
    return card.color;
  }
  let hash = 0;
  for (const char of card.storeName.trim().toLocaleLowerCase()) {
    hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  }
  return CARD_COLORS[hash % CARD_COLORS.length];
}

/** First letter of the store name, shown when the card has no icon. */
export function cardInitialOf(storeName: string): string {
  const [first = '?'] = storeName.trim();
  return first.toLocaleUpperCase();
}
