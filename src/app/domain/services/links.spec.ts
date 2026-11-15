import { isWebUrl, mapSearchUri, shopSearchTermOf, webMapSearchUrl } from './links';

describe('links', () => {
  it.each(['https://example.com', 'http://example.com/path?q=1', 'https://bäckerei.de'])('accepts %s', (url) => {
    expect(isWebUrl(url)).toBe(true);
  });

  it.each(['example.com', 'javascript:alert(1)', 'mailto:a@b.de', 'ftp://example.com', 'https://', ''])(
    'rejects %s',
    (url) => {
      expect(isWebUrl(url)).toBe(false);
    },
  );

  it('uses the shop search term, else the store name', () => {
    expect(shopSearchTermOf({ storeName: ' Bakery ', shopSearchTerm: ' Bakery Main St ' })).toBe('Bakery Main St');
    expect(shopSearchTermOf({ storeName: ' Bakery ' })).toBe('Bakery');
    expect(shopSearchTermOf({ storeName: 'Bakery', shopSearchTerm: '  ' })).toBe('Bakery');
  });

  it('builds an encoded geo search URI', () => {
    expect(mapSearchUri('Bäckerei & Café')).toBe('geo:0,0?q=B%C3%A4ckerei%20%26%20Caf%C3%A9');
  });

  it('builds an encoded OpenStreetMap search URL', () => {
    expect(webMapSearchUrl('A&B')).toBe('https://www.openstreetmap.org/search?query=A%26B');
  });
});
