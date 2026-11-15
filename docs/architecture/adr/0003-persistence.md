# ADR-0003: Persistence

- Status: accepted
- Date: 2026-11-08
- arc42 reference: 4.2, 5.1

## Context

All data must be stored locally on the device (F-04). Cards have structured data, websites (1:n)
and photos (1:n, F-09).

## Options

1. SQLite via a Capacitor SQLite plugin – relational, schema migrations, queries (sorting, search).
2. Key-value store (Capacitor Preferences) holding JSON – simple, but no queries/migrations; not
   intended for larger data.
3. JSON file(s) in the app sandbox via the Filesystem plugin – simple, but whole-file rewrites,
   own migration handling.

Photos: stored as files in the app's private storage (Filesystem plugin), referenced from the
database – not as BLOBs.

## Decision

SQLite for structured data; photos as files in the app sandbox. Access only through a repository
interface in the domain layer.

## Consequences

- Schema versioning and migrations from the first release.
- Export (ADR-0004) reads from the repository, independent from the storage format.

## Implementation (step 7)

- Photo files live in the app's private files folder as `photos/<id>.jpg` (`@capacitor/filesystem`,
  `Directory.Data`), so Android Auto Backup includes them (ADR-0014). The `photo` table stores id,
  card, role and position (schema migration 2 added `position`).
- To stay well below the Auto Backup quota (arc42 11.1), each photo is shrunk to at most 1600 px on
  its longer edge and saved as JPEG at 80 % quality (about 200–400 KB). A custom icon image is the
  centered square, scaled to 256 × 256 px. Decoding and encoding use a canvas in the WebView.
- Photos come from `@capacitor/camera` 8.2.6: `takePhoto` opens the system camera app and
  `chooseFromGallery` the Android photo picker. Neither needs a permission, and the app declares no
  `CAMERA` or storage permission.
- Roles: `front`, `back` and `icon` at most once per card, `other` any number of times. The editor
  offers front, back and the icon image for now; more photos can be added to the UI later without
  changing the schema or the export format.
- Photo files that no card refers to (replaced or removed photos, discarded edits, deleted cards)
  are deleted after each card save, card deletion and import.
