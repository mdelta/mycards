import type { ExternalLauncher } from '../../domain/ports/external-launcher';

/** Browser fallback (development, e2e tests): opens web pages in a new tab; other schemes fail. */
export class BrowserExternalLauncher implements ExternalLauncher {
  constructor(private readonly window: Pick<Window, 'open'>) {}

  async open(url: string): Promise<boolean> {
    if (!/^https?:/i.test(url)) {
      return false;
    }
    // With `noopener`, `window.open` always returns null, so success cannot be detected.
    this.window.open(url, '_blank', 'noopener');
    return true;
  }
}
