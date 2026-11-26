import type { DevicePlugin } from '@capacitor/device';
import type * as SentryBrowser from '@sentry/browser';
import type { Contexts, ErrorEvent, Exception } from '@sentry/browser';

import type { ReportKind, UsageSummary } from '../../domain/model/telemetry';
import type { ReportHooks, ReportSender } from '../../domain/ports/report-sender';

export type SentrySdk = Pick<
  typeof SentryBrowser,
  | 'init'
  | 'close'
  | 'captureException'
  | 'captureEvent'
  | 'eventFiltersIntegration'
  | 'browserApiErrorsIntegration'
  | 'globalHandlersIntegration'
  | 'linkedErrorsIntegration'
  | 'dedupeIntegration'
  | 'makeFetchTransport'
>;

type Transport = ReturnType<SentrySdk['makeFetchTransport']>;
type Envelope = Parameters<Transport['send']>[0];

export const USAGE_MESSAGE = 'Usage summary';

/**
 * Sends reports with the Sentry browser SDK (ADR-0018). Only errors of the app's own code are
 * captured; no breadcrumbs, tracing, sessions, client reports or user data. Every event is reduced
 * to an allow-list of fields and its messages are scrubbed by the domain before it leaves the app.
 * There is no offline queue: a report that can't be delivered is dropped, so nothing is sent after
 * the user turns a switch off, and "Sent data" lists only reports Sentry accepted.
 */
export class SentryReportSender implements ReportSender {
  private sdk?: SentrySdk;
  private contexts: Contexts = {};
  private readonly pending = new Map<string, { kind: ReportKind; event: ErrorEvent }>();

  constructor(
    private readonly dsn: string,
    private readonly loadSdk: () => Promise<SentrySdk>,
    private readonly device: Pick<DevicePlugin, 'getInfo'>,
    private readonly appVersion: () => Promise<{ version: string; build: string } | undefined>,
    private readonly environment: string,
  ) {}

  get configured(): boolean {
    return !!this.dsn;
  }

  async start(hooks: ReportHooks): Promise<void> {
    const [sdk, device, app] = await Promise.all([
      this.loadSdk(),
      this.device.getInfo().catch(() => undefined),
      this.appVersion().catch(() => undefined),
    ]);
    this.contexts = {
      os: {
        name: device?.operatingSystem === 'android' ? 'Android' : device?.operatingSystem,
        version: device?.osVersion,
      },
      device: { model: device?.model, manufacturer: device?.manufacturer },
      app: { app_version: app && `${app.version} (${app.build})` },
    };
    sdk.init({
      dsn: this.dsn,
      release: app && `mycards@${app.version}+${app.build}`,
      environment: this.environment,
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        urlQueryParams: false,
        stackFrameVariables: false,
        frameContextLines: 0,
      },
      sendClientReports: false,
      defaultIntegrations: false,
      integrations: [
        sdk.eventFiltersIntegration(),
        sdk.browserApiErrorsIntegration(),
        sdk.globalHandlersIntegration(),
        sdk.linkedErrorsIntegration(),
        sdk.dedupeIntegration(),
      ],
      maxBreadcrumbs: 0,
      beforeBreadcrumb: () => null,
      beforeSend: (event) => this.beforeSend(event, hooks),
      transport: (options) => this.recordingTransport(sdk.makeFetchTransport(options), hooks),
    });
    this.sdk = sdk;
  }

  async stop(): Promise<void> {
    const sdk = this.sdk;
    this.sdk = undefined;
    await sdk?.close(2000);
  }

  sendError(error: unknown): void {
    this.sdk?.captureException(error);
  }

  sendUsage(summary: UsageSummary): void {
    this.sdk?.captureEvent({
      message: USAGE_MESSAGE,
      level: 'info',
      tags: { report: 'usage' },
      contexts: { usage: { ...summary } },
    });
  }

  private async beforeSend(event: ErrorEvent, hooks: ReportHooks): Promise<ErrorEvent | null> {
    const kind: ReportKind = event.tags?.['report'] === 'usage' ? 'usage' : 'crash';
    const exceptions = kind === 'crash' ? (event.exception?.values ?? []) : [];
    const messages = await hooks.prepare({ kind, messages: exceptions.map((e) => e.value ?? '') });
    if (!messages) {
      return null;
    }
    const allowed: ErrorEvent = {
      type: undefined,
      event_id: event.event_id,
      timestamp: event.timestamp,
      platform: event.platform,
      level: event.level,
      release: event.release,
      environment: event.environment,
      sdk: { name: event.sdk?.name, version: event.sdk?.version },
      tags: { report: kind },
      contexts: kind === 'usage' ? { ...this.contexts, usage: event.contexts?.['usage'] } : { ...this.contexts },
      ...(kind === 'usage'
        ? { message: USAGE_MESSAGE }
        : { exception: { values: exceptions.map((e, i) => allowedException(e, messages[i])) } }),
    };
    const sent = JSON.parse(JSON.stringify(allowed)) as ErrorEvent;
    if (sent.event_id) {
      this.pending.set(sent.event_id, { kind, event: sent });
    }
    return sent;
  }

  /** Records each event under "Sent data" once Sentry has accepted it. */
  private recordingTransport(transport: Transport, hooks: ReportHooks): Transport {
    return {
      ...transport,
      send: async (envelope: Envelope) => {
        const header = envelope[0] as { event_id?: unknown };
        const id = typeof header.event_id === 'string' ? header.event_id : undefined;
        const report = id ? this.pending.get(id) : undefined;
        if (id) {
          this.pending.delete(id);
        }
        const response = await transport.send(envelope);
        const status = response.statusCode ?? 0;
        if (report && status >= 200 && status < 300) {
          await hooks.record(report.kind, report.event);
        }
        return response;
      },
    };
  }
}

function allowedException(exception: Exception, message: string | undefined): Exception {
  return {
    type: exception.type,
    value: message,
    mechanism: exception.mechanism && { type: exception.mechanism.type, handled: exception.mechanism.handled },
    stacktrace: exception.stacktrace && {
      frames: (exception.stacktrace.frames ?? []).map((frame) => ({
        filename: frame.filename?.replace(/[?#].*$/, ''),
        function: frame.function,
        lineno: frame.lineno,
        colno: frame.colno,
        in_app: frame.in_app,
      })),
    },
  };
}
