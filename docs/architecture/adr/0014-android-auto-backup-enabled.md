# ADR-0014: Android Auto Backup enabled

- Status: accepted
- Date: 2026-11-08
- arc42 reference: 2, 8, 11.1

## Context

All data is stored locally (F-04). Android can automatically back up app data to the user's
Google account ("Auto Backup").

## Decision

**Auto Backup stays enabled.** This is the only accepted way data leaves the device besides
user-triggered exports.

## Consequences

- Cards can be restored automatically on a new device / after reinstall.
- Google documents a per-app quota (25 MB); photos may exceed it – keep photos compressed and
  exclude regenerable files (e.g. lock-screen images) via backup rules.
- The Play Data-safety form and privacy policy must describe this correctly.
- Manual export (ADR-0004) remains the documented backup method.
