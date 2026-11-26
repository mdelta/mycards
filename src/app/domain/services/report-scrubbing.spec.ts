import { aCard } from '../../../testing/card-builder';

import { CARD_DATA_PLACEHOLDER, scrubText, sensitiveTexts } from './report-scrubbing';

describe('report scrubbing', () => {
  it('collects card and tag texts of at least three characters', () => {
    const card = aCard({
      storeName: 'Coffee Corner',
      cardId: '12',
      barcodeValue: 'ABC-123',
      note: 'first line\nsecond line',
      homepageUrl: 'https://coffee.example',
      shopSearchTerm: 'coffee near me',
      websites: [{ label: 'Offers', url: 'https://offers.example' }],
    });

    expect(sensitiveTexts([card], [{ id: 't', name: 'Food' }])).toEqual([
      'Coffee Corner',
      'ABC-123',
      'first line\nsecond line',
      'first line',
      'second line',
      'https://coffee.example',
      'coffee near me',
      'https://offers.example',
      'Offers',
      'Food',
    ]);
  });

  it('replaces card texts, ignoring case, longest first', () => {
    expect(scrubText('Cannot render coffee corner for Coffee', ['Coffee', 'Coffee Corner'])).toBe(
      `Cannot render ${CARD_DATA_PLACEHOLDER} for ${CARD_DATA_PLACEHOLDER}`,
    );
  });

  it('treats card texts as plain text, not as patterns', () => {
    expect(scrubText('value a+b (x) here', ['a+b (x)'])).toBe(`value ${CARD_DATA_PLACEHOLDER} here`);
  });

  it('removes quoted text and numbers with four or more digits', () => {
    expect(scrubText(`Bad value "Secret Shop" and 'x' for 123 and 98765`, [])).toBe(
      `Bad value "[text]" and '[text]' for 123 and [number]`,
    );
  });

  it('shortens very long messages', () => {
    const scrubbed = scrubText('a'.repeat(600), []);

    expect(scrubbed).toHaveLength(501);
    expect(scrubbed.endsWith('…')).toBe(true);
  });
});
