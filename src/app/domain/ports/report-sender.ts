import type { ReportKind, UsageSummary } from '../model/telemetry';

/** A report on its way out, before it is scrubbed. */
export interface OutgoingReport {
  kind: ReportKind;
  /** Free text that could contain user input, i.e. error messages. */
  messages: string[];
}

/** Lets the domain check consent, scrub and log each report right before it is sent. */
export interface ReportHooks {
  /** Returns the scrubbed messages, or `undefined` to drop the report. */
  prepare(report: OutgoingReport): Promise<string[] | undefined>;
  /** Called with the final report as it is handed to the network. */
  record(kind: ReportKind, payload: unknown): Promise<void>;
}

/** Sends crash reports and usage summaries to Sentry (ADR-0018). */
export interface ReportSender {
  /** `false` in builds without a DSN; the app then hides the switches. */
  readonly configured: boolean;
  start(hooks: ReportHooks): Promise<void>;
  stop(): Promise<void>;
  sendError(error: unknown): void;
  sendUsage(summary: UsageSummary): void;
}
