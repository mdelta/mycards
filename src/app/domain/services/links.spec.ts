import type { ExternalLauncher } from '../ports/external-launcher';

import { isWebUrl, mapSearchUri, openShopSearch, shopSearchTermOf, webMapSearchUrl } from './links';

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

  describe('openShopSearch', () => {
    function launcherOpening(...openable: string[]): ExternalLauncher & { opened: string[] } {
      const opened: string[] = [];
      return {
        opened,
        open: async (url) => {
          opened.push(url);
          return openable.some((prefix) => url.startsWith(prefix));
        },
      };
    }

    it('opens the map app with the search term', async () => {
      const launcher = launcherOpening('geo:');

      expect(await openShopSearch(launcher, { storeName: 'Bakery' })).toBe(true);
      expect(launcher.opened).toEqual(['geo:0,0?q=Bakery']);
    });

    it('falls back to OpenStreetMap in the browser without a map app', async () => {
      const launcher = launcherOpening('https:');

      expect(await openShopSearch(launcher, { storeName: 'Bakery' })).toBe(true);
      expect(launcher.opened).toEqual(['geo:0,0?q=Bakery', 'https://www.openstreetmap.org/search?query=Bakery']);
    });

    it('reports when nothing can open the search', async () => {
      expect(await openShopSearch(launcherOpening(), { storeName: 'Bakery' })).toBe(false);
    });
  });
});
