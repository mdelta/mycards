import type { PreferencesPlugin } from '@capacitor/preferences';

import type { SentReport, TelemetryConsent, UsageCounts, UsageFeature } from '../../domain/model/telemetry';
import type { TelemetryStore } from '../../domain/ports/telemetry-store';

const CONSENT_KEY = 'telemetryConsent';
const COUNTS_KEY = 'usageCounts';
const PERIOD_KEY = 'usagePeriodStart';
const SENT_KEY = 'sentReports';

/** Telemetry state in Android's SharedPreferences (localStorage in the browser). */
export class PreferencesTelemetryStore implements TelemetryStore {
  constructor(private readonly preferences: Pick<PreferencesPlugin, 'get' | 'set' | 'remove'>) {}

  async consent(): Promise<TelemetryConsent> {
    const stored = await this.read<Partial<TelemetryConsent>>(CONSENT_KEY);
    return { crashReports: stored?.crashReports === true, usageData: stored?.usageData === true };
  }

  setConsent(consent: TelemetryConsent): Promise<void> {
    return this.write(CONSENT_KEY, consent);
  }

  async usageCounts(): Promise<UsageCounts> {
    return (await this.read<UsageCounts>(COUNTS_KEY)) ?? {};
  }

  async countUsage(feature: UsageFeature): Promise<void> {
    const counts = await this.usageCounts();
    await this.write(COUNTS_KEY, { ...counts, [feature]: (counts[feature] ?? 0) + 1 });
  }

  resetUsageCounts(): Promise<void> {
    return this.preferences.remove({ key: COUNTS_KEY });
  }

  async usagePeriodStart(): Promise<string | undefined> {
    return (await this.preferences.get({ key: PERIOD_KEY })).value ?? undefined;
  }

  setUsagePeriodStart(at: string): Promise<void> {
    return this.preferences.set({ key: PERIOD_KEY, value: at });
  }

  async sentReports(): Promise<SentReport[]> {
    return (await this.read<SentReport[]>(SENT_KEY)) ?? [];
  }

  async addSentReport(report: SentReport, limit: number): Promise<void> {
    await this.write(SENT_KEY, [report, ...(await this.sentReports())].slice(0, limit));
  }

  private async read<T>(key: string): Promise<T | undefined> {
    const { value } = await this.preferences.get({ key });
    if (!value) {
      return undefined;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }

  private write(key: string, value: unknown): Promise<void> {
    return this.preferences.set({ key, value: JSON.stringify(value) });
  }
}
