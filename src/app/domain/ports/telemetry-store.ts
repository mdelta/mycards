import type { SentReport, TelemetryConsent, UsageCounts, UsageFeature } from '../model/telemetry';

/** Consent, usage counters and the "Sent data" log, kept on the device (ADR-0018). */
export interface TelemetryStore {
  consent(): Promise<TelemetryConsent>;
  setConsent(consent: TelemetryConsent): Promise<void>;
  usageCounts(): Promise<UsageCounts>;
  countUsage(feature: UsageFeature): Promise<void>;
  resetUsageCounts(): Promise<void>;
  /** When the last usage summary was sent or usage data was switched on (ISO-8601). */
  usagePeriodStart(): Promise<string | undefined>;
  setUsagePeriodStart(at: string): Promise<void>;
  /** Newest first. */
  sentReports(): Promise<SentReport[]>;
  /** Keeps only the newest `limit` reports. */
  addSentReport(report: SentReport, limit: number): Promise<void>;
}
