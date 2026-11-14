# ADR-0004: Import/export – own format plus Catima compatibility mode

- Status: accepted
- Date: 2026-11-08
- arc42 reference: 1.1 (F-05, F-11), 4.2

## Context

Data is local only (F-04); import/export is the only way to back up data or move to another device.
Users of Catima should be able to switch to MyCards.

## Decision

- On export the user **chooses the format**: own format or Catima format. Import supports both.
- **Own format:** a ZIP file containing a versioned JSON document with all data plus the photo
  files. Optional password. [DECIDED] Encryption via ZIP AES-256 (not the weak legacy ZipCrypto),
  with the `@zip.js/zip.js` library.
- **Catima format:** implemented from the observed file format only – no Catima code is used
  (ADR-0007). Fields without a counterpart are dropped or mapped; the mapping is documented.
- **Import, no merge logic:**
  - Default: cards contained in the import file overwrite the matching existing cards completely;
    all other existing cards stay untouched.
  - Option "clean import" (setting): all existing data is deleted before importing.
  - Matching key for "same card" (own format: card id; Catima: Catima id or card ID + store) is
    defined in the format specification.
- [DECIDED] Files: **import** opens the Android system file picker
  (`@capawesome/capacitor-file-picker`, no storage permission). **Export** writes the ZIP to the
  app's cache folder (`@capacitor/filesystem`) and opens the Android share sheet
  (`@capacitor/share`), from which the user sends it to Google Drive, a files app, e-mail etc. No
  own "Save as" dialog, so no custom Kotlin plugin. The cache folder is emptied before each export.
- [DECIDED] Own format version 1 and the import rules are specified in
  [formats/mycards-backup.md](../../formats/mycards-backup.md). The "clean import" setting is a
  switch on the export/import screen, off by default, and asks for confirmation.

## Consequences

- Format specification lives in `docs/` and is versioned with the code.
- Saving to local storage needs an installed app that accepts shared files (e.g. Files by Google).
- Round-trip tests (export → import) and tests with real Catima export files.
