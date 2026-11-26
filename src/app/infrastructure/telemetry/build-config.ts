declare const SENTRY_DSN: string | undefined;

/** Set at build time from the `SENTRY_DSN` environment variable (scripts/ng-build.mjs, ADR-0018). */
export const BUILD_SENTRY_DSN = typeof SENTRY_DSN === 'string' ? SENTRY_DSN : '';
