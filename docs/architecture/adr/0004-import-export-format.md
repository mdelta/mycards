# ADR-0004: Import/export – own format plus Catima compatibility mode

- Status: accepted (one detail open, arc42 Q-7)
- Date: 2026-11-08
- arc42 reference: 1.1 (F-05, F-11), 4.2

## Context

Data is local only (F-04); import/export is the only way to back up data or move to another device.
Users of Catima should be able to switch to MyCards.

## Decision

- On export the user **chooses the format**: own format or Catima format. Import supports both.
- **Own format:** a ZIP file containing a versioned JSON document with all data plus the photo
  files. Optional password. [Proposal] Encryption via ZIP AES-256 (not the weak legacy ZipCrypto),
  e.g. with the `@zip.js/zip.js` library – to be confirmed in implementation.
- **Catima format:** implemented from the observed file format only – no Catima code is used
  (ADR-0007). Fields without a counterpart are dropped or mapped; the mapping is documented.
- **Import replaces existing data; there is no merge logic.** Exact scope (all data vs. matching
  cards only) is open – arc42 Q-7.
- Files are read/written via the Android system file picker (Storage Access Framework) and/or the
  share sheet.

## Consequences

- Format specification lives in `docs/` and is versioned with the code.
- Round-trip tests (export → import) and tests with real Catima export files.
