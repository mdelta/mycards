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
