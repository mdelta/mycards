/** Source of the current time (ISO-8601), injectable for deterministic tests. */
export interface Clock {
  now(): string;
}
