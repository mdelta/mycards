import { ErrorHandler, Injectable, inject } from '@angular/core';

import { TELEMETRY } from '../infrastructure/providers';

/** Logs errors as Angular does and reports them, if crash reports are on (ADR-0018). */
@Injectable()
export class TelemetryErrorHandler extends ErrorHandler {
  private readonly telemetry = inject(TELEMETRY);

  override handleError(error: unknown): void {
    super.handleError(error);
    this.telemetry.reportError(error);
  }
}
