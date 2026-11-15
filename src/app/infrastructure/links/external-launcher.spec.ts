import { BrowserExternalLauncher } from './browser-external-launcher';
import { CapacitorExternalLauncher } from './capacitor-external-launcher';

describe('CapacitorExternalLauncher', () => {
  it('opens the URL and reports whether an app handled it', async () => {
    const openUrl = vi.fn().mockResolvedValue({ completed: true });
    expect(await new CapacitorExternalLauncher({ openUrl }).open('geo:0,0?q=x')).toBe(true);
    expect(openUrl).toHaveBeenCalledWith({ url: 'geo:0,0?q=x' });

    openUrl.mockResolvedValue({ completed: false });
    expect(await new CapacitorExternalLauncher({ openUrl }).open('geo:0,0?q=x')).toBe(false);
  });

  it('reports failure if the plugin throws', async () => {
    const openUrl = vi.fn().mockRejectedValue(new Error('no activity'));
    expect(await new CapacitorExternalLauncher({ openUrl }).open('https://a.de')).toBe(false);
  });
});

describe('BrowserExternalLauncher', () => {
  it('opens web pages in a new tab without access to the opener', async () => {
    const open = vi.fn().mockReturnValue(null);
    expect(await new BrowserExternalLauncher({ open }).open('https://a.de')).toBe(true);
    expect(open).toHaveBeenCalledWith('https://a.de', '_blank', 'noopener');
  });

  it('cannot open other schemes', async () => {
    const open = vi.fn();
    expect(await new BrowserExternalLauncher({ open }).open('geo:0,0?q=x')).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });
});
