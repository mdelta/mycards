/** Opt-in switches for reports to Sentry (R-1, R-3, ADR-0018); both off by default. */
export interface TelemetryConsent {
  crashReports: boolean;
  usageData: boolean;
}

export type ReportKind = 'crash' | 'usage';

/** Features counted for the weekly usage summary, only while usage data is switched on. */
export const USAGE_FEATURES = [
  'scan',
  'addManually',
  'showCard',
  'exportMyCards',
  'exportCatima',
  'importMyCards',
  'importCatima',
] as const;

export type UsageFeature = (typeof USAGE_FEATURES)[number];

export type UsageCounts = Partial<Record<UsageFeature, number>>;

/** Counts only, never card content. */
export interface UsageSummary {
  cards: number;
  /** Cards per barcode type; `NONE` for cards without a barcode. */
  barcodeTypes: Record<string, number>;
  tags: number;
  photos: number;
  features: Record<UsageFeature, number>;
}

/** A local copy of a report exactly as it was handed to Sentry, shown under "Sent data". */
export interface SentReport {
  kind: ReportKind;
  sentAt: string;
  payload: unknown;
}
