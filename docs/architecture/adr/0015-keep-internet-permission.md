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

- No network calls are made by current features; any future network use (e.g. presets backend)
  requires its own ADR and must not upload user data.
- The privacy policy / Data-safety form must reflect actual network use.
