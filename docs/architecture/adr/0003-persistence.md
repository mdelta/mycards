# ADR-0003: Persistence

- Status: proposed
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

## Decision (proposal)

SQLite for structured data; photos as files in the app sandbox. Access only through a repository
interface in the domain layer.

## Consequences

- Schema versioning and migrations from the first release.
- Export (ADR-0004) reads from the repository, independent from the storage format.
