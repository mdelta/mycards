import { CARD_COLORS, cardColorOf, cardInitialOf, isCardColor } from './card-appearance';

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe('card appearance', () => {
  it('offers 12 distinct colors that are readable with white text', () => {
    expect(new Set(CARD_COLORS).size).toBe(12);
    for (const color of CARD_COLORS) {
      expect(1.05 / (luminance(color) + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('accepts only #RRGGBB colors', () => {
    expect(isCardColor('#1565C0')).toBe(true);
    expect(isCardColor('#1565c0')).toBe(true);
    expect(isCardColor('1565C0')).toBe(false);
    expect(isCardColor('#FFF')).toBe(false);
    expect(isCardColor('red')).toBe(false);
  });

  it('uses the card color if set', () => {
    expect(cardColorOf({ color: '#123456', storeName: 'Bakery' })).toBe('#123456');
  });

  it('derives a stable palette color from the store name otherwise', () => {
    const color = cardColorOf({ storeName: 'Bakery' });
    expect(CARD_COLORS).toContain(color);
    expect(cardColorOf({ storeName: ' bakery ' })).toBe(color);
    const colors = new Set(['Bakery', 'Pharmacy', 'Grocer', 'Cinema', 'Garden'].map((storeName) => cardColorOf({ storeName })));
    expect(colors.size).toBeGreaterThan(1);
  });

  it('returns the upper-case first letter of the store name', () => {
    expect(cardInitialOf(' bakery')).toBe('B');
    expect(cardInitialOf('ärzte')).toBe('Ä');
    expect(cardInitialOf('🎉 Party')).toBe('🎉');
    expect(cardInitialOf('  ')).toBe('?');
  });
});
