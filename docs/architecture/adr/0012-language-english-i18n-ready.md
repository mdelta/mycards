# ADR-0012: English UI, prepared for translation

- Status: accepted
- Date: 2026-11-08
- arc42 reference: 2, 8

## Decision

The UI is **English only** at first. All user-visible texts are externalized (no hard-coded
strings) so translations can be added later. The i18n library (Angular built-in i18n or a runtime
library such as Transloco/ngx-translate) is chosen at implementation.

## Consequences

- Small overhead from the start; adding languages later needs no refactoring.
- Store listing initially in English.
