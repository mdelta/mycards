import { CapacitorAppInfo } from './capacitor-app-info';
import { SystemClock } from './system-clock';
import { UuidGenerator } from './uuid-generator';

describe('system adapters', () => {
  it('SystemClock returns the current time as ISO-8601', () => {
    const before = Date.now();
    const now = Date.parse(new SystemClock().now());

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });

  it('UuidGenerator returns distinct UUIDs', () => {
    const ids = new UuidGenerator();

    expect(ids.newId()).toMatch(/^[0-9a-f-]{36}$/);
    expect(ids.newId()).not.toBe(ids.newId());
  });
});

describe('CapacitorAppInfo', () => {
  const app = {
    getInfo: vi.fn(async () => ({ name: 'MyCards', id: 'de.orisian.apps.mycards', version: '1.2', build: '7' })),
  };

  it('shows version name and build number of the installed app', async () => {
    expect(await new CapacitorAppInfo(app, true).version()).toBe('1.2 (7)');
  });

  it('has no version in the browser', async () => {
    expect(await new CapacitorAppInfo(app, false).version()).toBeUndefined();
    expect(app.getInfo).not.toHaveBeenCalled();
  });
});
