# ADR-0018: Opt-in crash reports and usage data via Sentry

- Status: accepted
- Date: 2026-11-23
- arc42 reference: 1.2, 3.2, 8, 11

## Context

The product owner wants to learn about crashes and about how the app is used (e.g. barcode types,
number of cards) to improve it (R-1, R-3). Privacy is quality goal #2: card data must not leave the
device. Users must know what is sent and should be able to see it.

## Options

- **Sentry (sentry.io, EU data region)** – hosted service, `@sentry/capacitor` (MIT) with
  `@sentry/angular`; covers TypeScript errors and, according to its documentation, native Android
  crashes.
- Self-hosted Sentry – full data control, but a server to run and maintain.
- No telemetry – keeps the privacy goal strictly, but gives no feedback about crashes.

## Decision

- **Sentry on sentry.io, EU data region** (PO decision), for both crash reports and usage data.
- **Two separate switches** in the settings (R-4): "Send crash reports" and "Send usage data".
  **Both off by default.** Turning one on first shows exactly which data is sent.
- **Never sent:** store names, card IDs, barcode values, notes, photos, tag names, websites, or any
  other card content; no IP address (`sendDefaultPii: false`, IP storage disabled in the Sentry
  project).
- **Crash reports:** error message, stack trace, app version, Android version, device model.
- **Usage data:** at most one summary per week with app version, Android version, device model,
  number of cards, cards per barcode type, number of tags and photos, and which features were used
  (e.g. scan, export, Catima import), as counts.
- **Visible to the user:** the app keeps a local copy of every report it sends and shows it under
  Settings → "Sent data".
- Nothing is sent and the Sentry SDK is not started while both switches are off.

## Consequences

- Privacy goal #2, ADR-0015 and the arc42 constraints change: besides ML Kit's metrics, MyCards
  itself sends data, but only after the user opts in, and never card content.
- The privacy policy and the Play data safety form must declare crash logs, diagnostics and app
  interactions as optional, user-controlled collection.
- The PO creates the Sentry account and project in the EU region; the DSN goes into the build
  configuration. A DSN is not a secret, but is kept out of source code where practical.
- To verify when implementing: native crash capture and the EU ingest endpoint with the current
  `@sentry/capacitor` version.
