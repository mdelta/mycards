import type { BrowserOptions, ErrorEvent } from '@sentry/browser';

import type { ReportHooks } from '../../domain/ports/report-sender';

import type { SentrySdk } from './sentry-report-sender';
import { SentryReportSender, USAGE_MESSAGE } from './sentry-report-sender';

describe('SentryReportSender', () => {
  let options: BrowserOptions;
  let sdk: { [K in keyof SentrySdk]: ReturnType<typeof vi.fn> };
  let hooks: ReportHooks & { prepare: ReturnType<typeof vi.fn>; record: ReturnType<typeof vi.fn> };
  const device = {
    getInfo: vi.fn(async () => ({
      operatingSystem: 'android',
      osVersion: '15',
      model: 'Pixel 9',
      manufacturer: 'Google',
      name: "Alice's phone",
    })),
  };

  function sender(dsn = 'https://key@o1.ingest.de.sentry.io/2'): SentryReportSender {
    return new SentryReportSender(
      dsn,
      async () => sdk as unknown as SentrySdk,
      device as never,
      async () => ({ version: '1.2', build: '7' }),
      'production',
    );
  }

  const beforeSend = (event: ErrorEvent): Promise<ErrorEvent | null> =>
    (options.beforeSend as (e: ErrorEvent, h: object) => Promise<ErrorEvent | null>)(event, {});

  beforeEach(() => {
    const integration = (name: string) => vi.fn(() => ({ name }));
    sdk = {
      init: vi.fn((o: BrowserOptions) => {
        options = o;
      }),
      close: vi.fn(async () => true),
      captureException: vi.fn(),
      captureEvent: vi.fn(),
      eventFiltersIntegration: integration('EventFilters'),
      browserApiErrorsIntegration: integration('BrowserApiErrors'),
      globalHandlersIntegration: integration('GlobalHandlers'),
      linkedErrorsIntegration: integration('LinkedErrors'),
      dedupeIntegration: integration('Dedupe'),
      makeFetchTransport: vi.fn(),
      makeBrowserOfflineTransport: vi.fn(() => 'offline-transport'),
    };
    hooks = {
      prepare: vi.fn(async ({ messages }: { messages: string[] }) => messages.map((m) => `scrubbed ${m}`)),
      record: vi.fn(async () => undefined),
    };
  });

  it('is only configured with a DSN', () => {
    expect(sender().configured).toBe(true);
    expect(sender('').configured).toBe(false);
  });

  it('starts without user data, breadcrumbs, sessions or client reports', async () => {
    await sender().start(hooks);

    expect(options).toMatchObject({
      dsn: 'https://key@o1.ingest.de.sentry.io/2',
      release: 'mycards@1.2+7',
      environment: 'production',
      dataCollection: { userInfo: false, cookies: false, httpHeaders: false, urlQueryParams: false },
      sendClientReports: false,
      defaultIntegrations: false,
      maxBreadcrumbs: 0,
      transport: 'offline-transport',
    });
    expect((options.integrations as { name: string }[]).map((i) => i.name)).toEqual([
      'EventFilters',
      'BrowserApiErrors',
      'GlobalHandlers',
      'LinkedErrors',
      'Dedupe',
    ]);
    expect(options.beforeBreadcrumb!({}, undefined)).toBeNull();
  });

  it('reduces error events to the allow-list, scrubs messages and records them', async () => {
    await sender().start(hooks);

    const sent = await beforeSend({
      type: undefined,
      event_id: 'e1',
      timestamp: 1,
      platform: 'javascript',
      level: 'error',
      release: 'mycards@1.2+7',
      environment: 'production',
      sdk: { name: 'sentry.javascript.browser', version: '11.19.0', integrations: ['Dedupe'] },
      message: 'Coffee Corner',
      request: { url: 'https://localhost/cards/abc' },
      breadcrumbs: [{ message: 'clicked Coffee Corner' }],
      user: { ip_address: '{{auto}}' },
      extra: { card: 'Coffee Corner' },
      tags: { route: '/cards/abc' },
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Cannot draw Coffee Corner',
            mechanism: { type: 'generic', handled: false, data: { x: 'y' } },
            stacktrace: {
              frames: [
                {
                  filename: 'https://localhost/main-ABC.js?v=1',
                  function: 'render',
                  lineno: 1,
                  colno: 2,
                  in_app: true,
                  vars: { value: 'Coffee Corner' },
                  context_line: 'x',
                },
              ],
            },
          },
        ],
      },
    });

    expect(hooks.prepare).toHaveBeenCalledWith({ kind: 'crash', messages: ['Cannot draw Coffee Corner'] });
    expect(sent).toEqual({
      event_id: 'e1',
      timestamp: 1,
      platform: 'javascript',
      level: 'error',
      release: 'mycards@1.2+7',
      environment: 'production',
      sdk: { name: 'sentry.javascript.browser', version: '11.19.0' },
      tags: { report: 'crash' },
      contexts: {
        os: { name: 'Android', version: '15' },
        device: { model: 'Pixel 9', manufacturer: 'Google' },
        app: { app_version: '1.2 (7)' },
      },
      exception: {
        values: [
          {
            type: 'Error',
            value: 'scrubbed Cannot draw Coffee Corner',
            mechanism: { type: 'generic', handled: false },
            stacktrace: {
              frames: [
                { filename: 'https://localhost/main-ABC.js', function: 'render', lineno: 1, colno: 2, in_app: true },
              ],
            },
          },
        ],
      },
    });
    expect(hooks.record).toHaveBeenCalledWith('crash', sent);
    expect(JSON.stringify(sent)).not.toContain("Alice's phone");
  });

  it('drops events the domain rejects', async () => {
    hooks.prepare.mockResolvedValue(undefined);
    await sender().start(hooks);

    expect(await beforeSend({ type: undefined, exception: { values: [{ value: 'x' }] } })).toBeNull();
    expect(hooks.record).not.toHaveBeenCalled();
  });

  it('sends the usage summary as an info event with counts only', async () => {
    const s = sender();
    await s.start(hooks);
    const summary = {
      cards: 2,
      barcodeTypes: { QR_CODE: 2 },
      tags: 0,
      photos: 0,
      features: {
        scan: 1,
        addManually: 0,
        showCard: 3,
        exportMyCards: 0,
        exportCatima: 0,
        importMyCards: 0,
        importCatima: 0,
      },
    };

    s.sendUsage(summary);
    const event = sdk.captureEvent.mock.calls[0][0] as ErrorEvent;
    expect(event).toMatchObject({ message: USAGE_MESSAGE, level: 'info', tags: { report: 'usage' } });

    const sent = await beforeSend({ ...event, type: undefined, extra: { leaked: 'x' } });
    expect(hooks.prepare).toHaveBeenCalledWith({ kind: 'usage', messages: [] });
    expect(sent).toMatchObject({ message: USAGE_MESSAGE, tags: { report: 'usage' }, contexts: { usage: summary } });
    expect(sent).not.toHaveProperty('extra');
    expect(sent).not.toHaveProperty('exception');
  });

  it('captures errors while started and closes the SDK on stop', async () => {
    const s = sender();
    s.sendError(new Error('before start'));
    await s.start(hooks);
    const error = new Error('boom');

    s.sendError(error);
    await s.stop();
    s.sendError(new Error('after stop'));

    expect(sdk.captureException).toHaveBeenCalledTimes(1);
    expect(sdk.captureException).toHaveBeenCalledWith(error);
    expect(sdk.close).toHaveBeenCalled();
  });

  it('starts without device or version details where they are unavailable', async () => {
    device.getInfo.mockRejectedValueOnce(new Error('unavailable'));
    const s = new SentryReportSender(
      'dsn',
      async () => sdk as unknown as SentrySdk,
      device as never,
      async () => undefined,
      'development',
    );

    await s.start(hooks);
    const sent = await beforeSend({ type: undefined });

    expect(options.release).toBeUndefined();
    expect(sent?.contexts).toEqual({ os: {}, device: {}, app: {} });
  });
});
