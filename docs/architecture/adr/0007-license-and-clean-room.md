# ADR-0007: License GPL v3, no code reuse from Catima

- Status: accepted
- Date: 2026-11-08
- arc42 reference: 2

## Context

MyCards covers a similar use case as Catima (GPL-3.0). The product owner wants a new application,
licensed under the latest GPL.

## Decision

- License: **GNU General Public License v3 or later** – SPDX identifier `GPL-3.0-or-later`
  (`LICENSE` contains the GPL v3 text).
- **Clean-room rule:** no source code, resources or assets are copied from Catima or other loyalty
  card apps. Catima is used only as a functional reference and its export format is implemented
  for compatibility (ADR-0004).

## Consequences

- Third-party dependencies must be GPL-3.0-compatible.
- Code review checks for copied code.
