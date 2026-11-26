import { TestBed } from '@angular/core/testing';

import { TELEMETRY } from '../infrastructure/providers';

import { TelemetryErrorHandler } from './telemetry-error-handler';

describe('TelemetryErrorHandler', () => {
  it('logs the error and hands it to telemetry', () => {
    const reportError = vi.fn();
    TestBed.configureTestingModule({
      providers: [TelemetryErrorHandler, { provide: TELEMETRY, useValue: { reportError } }],
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new Error('boom');

    TestBed.inject(TelemetryErrorHandler).handleError(error);

    expect(log).toHaveBeenCalled();
    expect(reportError).toHaveBeenCalledWith(error);
    log.mockRestore();
  });
});
