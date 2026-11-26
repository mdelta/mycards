import { aCard } from '../../../testing/card-builder';
import { InMemoryCardRepository } from '../../../testing/in-memory-card-repository';
import type { SentReport, TelemetryConsent, UsageCounts, UsageFeature } from '../model/telemetry';
import type { ReportHooks, ReportSender } from '../ports/report-sender';
import type { TelemetryStore } from '../ports/telemetry-store';

import { SENT_REPORTS_LIMIT, TelemetryService } from './telemetry-service';

class FakeStore implements TelemetryStore {
  stored: TelemetryConsent = { crashReports: false, usageData: false };
  counts: UsageCounts = {};
  periodStart?: string;
  reports: SentReport[] = [];
  async consent(): Promise<TelemetryConsent> {
    return this.stored;
  }
  async setConsent(consent: TelemetryConsent): Promise<void> {
    this.stored = consent;
  }
  async usageCounts(): Promise<UsageCounts> {
    return this.counts;
  }
  async countUsage(feature: UsageFeature): Promise<void> {
    this.counts[feature] = (this.counts[feature] ?? 0) + 1;
  }
  async resetUsageCounts(): Promise<void> {
    this.counts = {};
  }
  async usagePeriodStart(): Promise<string | undefined> {
    return this.periodStart;
  }
  async setUsagePeriodStart(at: string): Promise<void> {
    this.periodStart = at;
  }
  async sentReports(): Promise<SentReport[]> {
    return this.reports;
  }
  async addSentReport(report: SentReport, limit: number): Promise<void> {
    this.reports = [report, ...this.reports].slice(0, limit);
  }
}

describe('TelemetryService', () => {
  let store: FakeStore;
  let repository: InMemoryCardRepository;
  let now: string;
  let hooks: ReportHooks | undefined;
  let sender: ReportSender & { configured: boolean };
  let service: TelemetryService;

  beforeEach(() => {
    store = new FakeStore();
    repository = new InMemoryCardRepository(
      [
        aCard({ id: '1', storeName: 'Coffee Corner', barcodeType: 'QR_CODE', photos: [{ id: 'p', role: 'front' }] }),
        aCard({ id: '2', storeName: 'Book Shop', barcodeType: 'QR_CODE' }),
        aCard({ id: '3', storeName: 'Bakery', barcodeType: undefined }),
      ],
      [{ id: 't', name: 'Food' }],
    );
    now = '2026-12-01T10:00:00.000Z';
    hooks = undefined;
    sender = {
      configured: true,
      start: vi.fn(async (h: ReportHooks) => {
        hooks = h;
      }),
      stop: vi.fn(async () => undefined),
      sendError: vi.fn(),
      sendUsage: vi.fn(),
    };
    service = new TelemetryService(store, sender, () => repository, { now: () => now });
  });

  it('starts nothing while both switches are off', async () => {
    await service.init();
    await service.count('scan');
    service.reportError(new Error('x'));

    expect(sender.start).not.toHaveBeenCalled();
    expect(sender.sendError).not.toHaveBeenCalled();
    expect(store.counts).toEqual({});
  });

  it('does nothing in builds without a DSN', async () => {
    sender.configured = false;
    store.stored = { crashReports: true, usageData: true };

    await service.init();

    expect(service.available).toBe(false);
    expect(sender.start).not.toHaveBeenCalled();
  });

  it('starts with the stored consent and reports errors only with crash reports on', async () => {
    store.stored = { crashReports: true, usageData: false };
    await service.init();
    const error = new Error('boom');

    service.reportError(error);
    await service.count('scan');

    expect(sender.start).toHaveBeenCalledTimes(1);
    expect(sender.sendError).toHaveBeenCalledWith(error);
    expect(store.counts).toEqual({});
  });

  it('starts and stops the sender when the switches change', async () => {
    await service.setConsent({ crashReports: true, usageData: false });
    await service.setConsent({ crashReports: true, usageData: true });
    expect(sender.start).toHaveBeenCalledTimes(1);
    expect(await service.consent()).toEqual({ crashReports: true, usageData: true });

    await service.setConsent({ crashReports: false, usageData: false });
    service.reportError(new Error('x'));

    expect(sender.stop).toHaveBeenCalledTimes(1);
    expect(sender.sendError).not.toHaveBeenCalled();
  });

  it('starts a new usage period with empty counts when usage data is turned on', async () => {
    store.counts = { scan: 4 };

    await service.setConsent({ crashReports: false, usageData: true });
    await service.count('scan');
    await service.count('showCard');

    expect(store.periodStart).toBe(now);
    expect(store.counts).toEqual({ scan: 1, showCard: 1 });
  });

  it('ignores storage errors while counting', async () => {
    await service.setConsent({ crashReports: false, usageData: true });
    vi.spyOn(store, 'countUsage').mockRejectedValue(new Error('full'));

    await expect(service.count('scan')).resolves.toBeUndefined();
  });

  it('sends the usage summary once a week and resets the counts', async () => {
    store.stored = { crashReports: false, usageData: true };
    store.periodStart = '2026-11-24T10:00:00.000Z';
    store.counts = { scan: 2, exportCatima: 1 };

    await service.init();
    expect(sender.sendUsage).toHaveBeenCalledWith({
      cards: 3,
      barcodeTypes: { QR_CODE: 2, NONE: 1 },
      tags: 1,
      photos: 1,
      features: {
        scan: 2,
        addManually: 0,
        showCard: 0,
        exportMyCards: 0,
        exportCatima: 1,
        importMyCards: 0,
        importCatima: 0,
      },
    });
    expect(store.counts).toEqual({ scan: 2, exportCatima: 1 });

    await hooks!.record('usage', { message: 'Usage summary' });
    expect(store.counts).toEqual({});
    expect(store.periodStart).toBe(now);

    now = '2026-12-07T10:00:00.000Z';
    await service.sendUsageIfDue();
    expect(sender.sendUsage).toHaveBeenCalledTimes(1);
  });

  it('sends the usage summary again when Sentry did not accept it', async () => {
    store.stored = { crashReports: false, usageData: true };
    store.periodStart = '2026-11-24T10:00:00.000Z';
    store.counts = { scan: 2 };

    await service.init();
    await service.sendUsageIfDue();

    expect(sender.sendUsage).toHaveBeenCalledTimes(2);
    expect(store.counts).toEqual({ scan: 2 });
    expect(store.periodStart).toBe('2026-11-24T10:00:00.000Z');
  });

  it('starts the first usage period without sending when none is stored', async () => {
    store.stored = { crashReports: false, usageData: true };

    await service.init();

    expect(sender.sendUsage).not.toHaveBeenCalled();
    expect(store.periodStart).toBe(now);
  });

  describe('hooks', () => {
    beforeEach(async () => {
      store.stored = { crashReports: true, usageData: false };
      await service.init();
    });

    it('drops reports whose switch is off', async () => {
      expect(await hooks!.prepare({ kind: 'usage', messages: [] })).toBeUndefined();
      expect(await hooks!.prepare({ kind: 'crash', messages: [] })).toEqual([]);
    });

    it('removes card content from error messages', async () => {
      const messages = await hooks!.prepare({
        kind: 'crash',
        messages: ['Cannot draw Coffee Corner for food', 'Card 98765432 failed'],
      });

      expect(messages).toEqual(['Cannot draw [card data] for [card data]', 'Card [number] failed']);
    });

    it('removes whole messages when the cards cannot be read', async () => {
      vi.spyOn(repository, 'findAll').mockRejectedValue(new Error('locked'));

      expect(await hooks!.prepare({ kind: 'crash', messages: ['Coffee Corner'] })).toEqual(['[removed]']);
    });

    it('keeps the newest sent reports for "Sent data"', async () => {
      for (let i = 0; i <= SENT_REPORTS_LIMIT; i++) {
        await hooks!.record('crash', { n: i });
      }

      const reports = await service.sentReports();
      expect(reports).toHaveLength(SENT_REPORTS_LIMIT);
      expect(reports[0]).toEqual({ kind: 'crash', sentAt: now, payload: { n: SENT_REPORTS_LIMIT } });
    });
  });
});
