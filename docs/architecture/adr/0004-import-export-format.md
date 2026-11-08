# ADR-0004: Import/export – own format plus Catima compatibility mode

- Status: accepted (details open, arc42 Q-7)
- Date: 2026-11-08
- arc42 reference: 1.1 (F-05, F-11), 4.2

## Context

Data is local only (F-04); import/export is the only way to back up data or move to another device.
Users of Catima should be able to switch to MyCards.

## Decision

- **Own format** is the primary format. It is versioned and contains all data including photos.
- **Catima compatibility mode** reads (and possibly writes, Q-7) Catima's export format.
  It is implemented from the observed file format only – no Catima code is used (ADR-0007).
- Files are read/written via the Android system file picker (Storage Access Framework) and/or the
  share sheet.

## Open details (Q-7)

- Container: JSON only vs. ZIP (JSON + photo files).
- Optional password encryption.
- Import behaviour: merge vs. replace, duplicate detection.
- Catima: import only, or import and export; mapping of fields that do not exist on either side.

## Consequences

- Format specification lives in `docs/` and is versioned with the code.
- Round-trip tests (export → import) and tests with real Catima export files.
