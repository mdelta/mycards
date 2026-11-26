# ADR-0015: Keep INTERNET permission

- Status: accepted
- Date: 2026-11-08
- arc42 reference: 3.2, 8

## Context

No decided feature needs network access (maps and websites are opened in other apps, ADR-0005).
An initial idea exists to download card presets (e.g. store names, logos) from a backend later.

## Decision

**Keep the INTERNET permission** for now.

## Consequences

- Network use: Google ML Kit's usage metrics (ADR-0010) and, only after the user opts in, crash
  reports of the app's own code and a weekly usage summary sent to Sentry's EU endpoint (ADR-0018).
  The Sentry browser SDK uses the existing permission and adds none. Any future network use (e.g. presets backend)
  requires its own ADR and must not upload card data.
- The privacy policy / Data-safety form must reflect actual network use.
