import type { ReportKind, SentReport, TelemetryConsent, UsageFeature, UsageSummary } from '../model/telemetry';
import { USAGE_FEATURES } from '../model/telemetry';
import type { CardRepository } from '../ports/card-repository';
import type { Clock } from '../ports/clock';
import type { OutgoingReport, ReportHooks, ReportSender } from '../ports/report-sender';
import type { TelemetryStore } from '../ports/telemetry-store';

import { scrubText, sensitiveTexts } from './report-scrubbing';

export const SENT_REPORTS_LIMIT = 20;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const REMOVED = '[removed]';

/**
 * Opt-in crash reports and usage data (R-1, R-3, ADR-0018). Nothing is collected or sent, and the
 * Sentry SDK is not started, while both switches are off.
 */
export class TelemetryService {
  private started = false;
  private current: TelemetryConsent = { crashReports: false, usageData: false };
  private readonly hooks: ReportHooks = {
    prepare: (report) => this.prepare(report),
    record: (kind, payload) => this.record(kind, payload),
  };

  constructor(
    private readonly store: TelemetryStore,
    private readonly sender: ReportSender,
    /** Lazy, so counting and error handling work before the card database is opened. */
    private readonly cards: () => CardRepository,
    private readonly clock: Clock,
  ) {}

  /** `false` in builds without a Sentry DSN. */
  get available(): boolean {
    return this.sender.configured;
  }

  async init(): Promise<void> {
    if (!this.available) {
      return;
    }
    this.current = await this.store.consent();
    await this.sync();
    await this.sendUsageIfDue();
  }

  consent(): Promise<TelemetryConsent> {
    return this.store.consent();
  }

  async setConsent(consent: TelemetryConsent): Promise<void> {
    const usageTurnedOn = consent.usageData && !this.current.usageData;
    this.current = consent;
    await this.store.setConsent(consent);
    if (usageTurnedOn) {
      await this.store.resetUsageCounts();
      await this.store.setUsagePeriodStart(this.clock.now());
    }
    await this.sync();
  }

  /** Counts a feature for the usage summary; does nothing unless usage data is on. */
  async count(feature: UsageFeature): Promise<void> {
    if (this.current.usageData) {
      await this.store.countUsage(feature).catch(() => undefined);
    }
  }

  reportError(error: unknown): void {
    if (this.started && this.current.crashReports) {
      this.sender.sendError(error);
    }
  }

  sentReports(): Promise<SentReport[]> {
    return this.store.sentReports();
  }

  /** Sends the usage summary if usage data is on and the last one is a week old. */
  async sendUsageIfDue(): Promise<void> {
    if (!this.started || !this.current.usageData) {
      return;
    }
    const now = this.clock.now();
    const start = await this.store.usagePeriodStart();
    if (start && Date.parse(now) - Date.parse(start) < WEEK_MS) {
      return;
    }
    if (start) {
      // The week ends only once Sentry accepted the summary (see record); otherwise it is retried.
      this.sender.sendUsage(await this.usageSummary());
    } else {
      await this.store.setUsagePeriodStart(now);
    }
  }

  async usageSummary(): Promise<UsageSummary> {
    const repository = this.cards();
    const [cards, tags, counts] = await Promise.all([
      repository.findAll(),
      repository.findAllTags(),
      this.store.usageCounts(),
    ]);
    const barcodeTypes: Record<string, number> = {};
    for (const card of cards) {
      const type = card.barcodeType ?? 'NONE';
      barcodeTypes[type] = (barcodeTypes[type] ?? 0) + 1;
    }
    return {
      cards: cards.length,
      barcodeTypes,
      tags: tags.length,
      photos: cards.reduce((sum, card) => sum + card.photos.length, 0),
      features: Object.fromEntries(USAGE_FEATURES.map((f) => [f, counts[f] ?? 0])) as UsageSummary['features'],
    };
  }

  private async sync(): Promise<void> {
    const wanted = this.current.crashReports || this.current.usageData;
    if (wanted && !this.started) {
      await this.sender.start(this.hooks);
      this.started = true;
    } else if (!wanted && this.started) {
      this.started = false;
      await this.sender.stop();
    }
  }

  private async prepare(report: OutgoingReport): Promise<string[] | undefined> {
    const allowed = report.kind === 'crash' ? this.current.crashReports : this.current.usageData;
    if (!allowed) {
      return undefined;
    }
    if (!report.messages.length) {
      return [];
    }
    try {
      const repository = this.cards();
      const sensitive = sensitiveTexts(await repository.findAll(), await repository.findAllTags());
      return report.messages.map((message) => scrubText(message, sensitive));
    } catch {
      // Without the card list, a message could contain card content that can't be recognized.
      return report.messages.map(() => REMOVED);
    }
  }

  private async record(kind: ReportKind, payload: unknown): Promise<void> {
    const now = this.clock.now();
    await this.store.addSentReport({ kind, sentAt: now, payload }, SENT_REPORTS_LIMIT);
    if (kind === 'usage') {
      await this.store.resetUsageCounts();
      await this.store.setUsagePeriodStart(now);
    }
  }
}
