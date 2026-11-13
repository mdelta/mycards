import type { Clock } from '../../domain/ports/clock';

export class SystemClock implements Clock {
  now(): string {
    return new Date().toISOString();
  }
}
