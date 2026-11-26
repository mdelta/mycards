# ADR-0018: Opt-in crash reports and usage data via Sentry

- Status: accepted
- Date: 2026-11-23, implementation details 2026-11-26
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

### Implementation (step R-B, PO decisions 2026-11-26)

- **Only errors of the app's own code** (TypeScript/Angular) are reported, so every report passes
  the app's filter and appears under "Sent data". Native Android crashes are **not** reported.
  Therefore the app uses `@sentry/browser` (MIT) only, loaded lazily when a switch is turned on;
  `@sentry/capacitor` and its native Android SDK are not used. Device details come from
  `@capacitor/device` (MIT, no permissions).
- **SDK configuration:** no default integrations except error capture (global handlers, browser API
  errors, linked errors, dedupe, event filters); no breadcrumbs, tracing, sessions, client reports,
  user data, cookies, headers or URL query parameters; offline transport so reports wait for a
  connection.
- **Allow-list:** `beforeSend` rebuilds each event from a fixed set of fields: event ID, time,
  level, release, environment, SDK name/version, OS/device/app context (Android version, model,
  manufacturer, app version), exception type, mechanism and stack frames (file without query, function,
  line, column). Everything else is dropped.
- **Scrubbing:** before an error is sent, the domain replaces texts of all stored cards and tags
  (≥ 3 characters, ignoring case), quoted text and numbers with ≥ 4 digits in error messages, and
  cuts them at 500 characters. If the cards can't be read, the messages are removed.
- **Usage summary:** one Sentry info event per week, counts only: cards, cards per barcode type,
  tags, photos and uses of scan, add manually, show card, MyCards/Catima export and MyCards/Catima
  import. Counting only runs while usage data is on; turning it on starts a new, empty week.
- **"Sent data":** the final event, exactly as handed to Sentry, is stored locally (newest 20) with
  `@capacitor/preferences`, like the consent and the counters. None of this is exported.
- **DSN:** from the build environment variable `SENTRY_DSN` (GitHub secret), passed to Angular as a
  build-time define. Builds without it (local builds, CI debug builds, forks) hide both switches
  and never start the SDK.
- **Source maps:** uploaded with the release workflow in step 10; until then stack traces are
  minified.

## Consequences

- Privacy goal #2, ADR-0015 and the arc42 constraints change: besides ML Kit's metrics, MyCards
  itself sends data, but only after the user opts in, and never card content.
- The privacy policy and the Play data safety form must declare crash logs, diagnostics and app
  interactions as optional, user-controlled collection.
- The PO creates the Sentry account and project in the EU region, turns on "Prevent Storing of IP
  Addresses" and stores the DSN as GitHub secret `SENTRY_DSN`. A DSN is not a secret, but keeping
  it out of the source code keeps forks from reporting to this project.
- Native crashes (e.g. in SQLite or ML Kit native code) stay invisible to the developer. This keeps
  the promise that every sent report is visible and filtered.
- The scrubbing is a heuristic; the allow-list is the main protection. Error messages are the only
  free text sent.
