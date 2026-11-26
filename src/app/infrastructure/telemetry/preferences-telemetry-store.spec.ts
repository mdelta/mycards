import { PreferencesTelemetryStore } from './preferences-telemetry-store';

describe('PreferencesTelemetryStore', () => {
  const values = new Map<string, string>();
  const preferences = {
    get: async ({ key }: { key: string }) => ({ value: values.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => {
      values.set(key, value);
    },
    remove: async ({ key }: { key: string }) => {
      values.delete(key);
    },
  };
  const store = new PreferencesTelemetryStore(preferences);

  beforeEach(() => values.clear());

  it('has both switches off by default and for unreadable values', async () => {
    expect(await store.consent()).toEqual({ crashReports: false, usageData: false });
    values.set('telemetryConsent', '{not json');
    expect(await store.consent()).toEqual({ crashReports: false, usageData: false });
    values.set('telemetryConsent', '{"crashReports":"yes","usageData":true}');
    expect(await store.consent()).toEqual({ crashReports: false, usageData: true });
  });

  it('keeps the consent', async () => {
    await store.setConsent({ crashReports: true, usageData: false });

    expect(await store.consent()).toEqual({ crashReports: true, usageData: false });
  });

  it('counts usage and resets the counts', async () => {
    await store.countUsage('scan');
    await store.countUsage('scan');
    await store.countUsage('showCard');
    expect(await store.usageCounts()).toEqual({ scan: 2, showCard: 1 });

    await store.resetUsageCounts();
    expect(await store.usageCounts()).toEqual({});
  });

  it('keeps the start of the usage period', async () => {
    expect(await store.usagePeriodStart()).toBeUndefined();

    await store.setUsagePeriodStart('2026-12-01T10:00:00.000Z');

    expect(await store.usagePeriodStart()).toBe('2026-12-01T10:00:00.000Z');
  });

  it('keeps the newest sent reports first, up to the limit', async () => {
    for (const n of [1, 2, 3]) {
      await store.addSentReport({ kind: 'usage', sentAt: `t${n}`, payload: { n } }, 2);
    }

    expect((await store.sentReports()).map((r) => r.sentAt)).toEqual(['t3', 't2']);
  });
});
