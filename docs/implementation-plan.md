# MyCards – Implementation Plan

> **Status: DRAFT for discussion.** Order and scope are proposals until the product owner approves
> them. Each step is one (or a few) pull requests that reference the arc42 sections and ADRs they
> implement. Points that need a decision are marked **[DECIDE]**.

## 1. Development principles

| Principle | How it is applied |
|-----------|-------------------|
| TDD | Domain services, mappers, format readers/writers and validators are written test-first (red → green → refactor). UI and thin platform adapters are tested after the fact where TDD adds little. |
| SOLID / separation of concerns | Layers from arc42 §5.2. The domain defines ports (interfaces); infrastructure implements them; UI only talks to domain services. Ports are bound to adapters with Angular `InjectionToken`s (dependency inversion), so tests can use in-memory fakes. One service per responsibility (e.g. `CardService`, `ExportService`, `CatimaMapper`). |
| Thin UI | Pages are containers that call services; reusable components are presentational (inputs/outputs only). No business rules in templates or pages. |
| Unit test coverage | Soft goal: ≥ 80 % line coverage. CI measures coverage with Vitest (`@vitest/coverage-v8`) and shows it in the job summary. [DECIDED] CI only reports coverage and never fails because of it. |
| Test pyramid | Many unit tests (Vitest), a few Playwright e2e flows against the web build, and a manual device checklist for native features (camera, lock screen, brightness). |
| Definition of done per step | Tests written/updated, lint + coverage green in CI, arc42/ADR updated if a decision changed, PR cites arc42/ADR. |

### Accepted trade-offs

- Native code (Kotlin lock-screen plugin, ML Kit, camera) cannot be covered by Vitest. Adapters
  around Capacitor plugins stay thin and are tested with mocked plugins; real behaviour is checked
  on an emulator/device.
- Ionic page templates are covered by e2e tests rather than by unit tests, which keeps the unit
  coverage number meaningful.
- Coverage excludes generated and bootstrap files (`main.ts`, environment files).

## 2. Steps (most important first)

Ordering follows the Must requirements (arc42 §1.1) and the quality goals (§1.2: speed of
presentation, privacy, data safety, maintainability, offline).

### Step 1 – Quality gates

- Coverage reporting in CI (see §1), shared test helpers (card builder, in-memory repository).
- Done when: CI shows coverage; `compareCards` and existing tests run through the new helpers.

### Step 2 – Storage and manual cards (F-01, F-04, F-10, F-12; ADR-0003, ADR-0016)

- Domain: `CardService` (create/update/delete, validation: store name and card ID required,
  balance not negative, expiry not before valid-from), `Clock`/`IdGenerator` ports for
  deterministic tests. Barcode value validation per type moved to step 3, together with rendering.
- Infrastructure: SQLite repository with a versioned schema and migrations for the full ADR-0016
  model (cards, tags, websites, photo references), so later steps add UI, not tables.
- UI: card list (favorites first, search by store name), card editor (Ionic forms), delete with
  confirmation, empty state.
- e2e: create → list → edit → delete in the web build.
- [DECIDED] SQLite plugin: `@capacitor-community/sqlite` (needs the `jeep-sqlite`
  WebAssembly fallback for browser/e2e).

### Step 3 – Card presentation (F-03, quality goal 1; ADR-0017)

- Domain: `BarcodeRenderer` port; barcode value/type validation rules per type.
- Infrastructure: `bwip-js` adapter rendering to SVG/canvas for all ADR-0017 types.
- UI: card detail screen with large barcode, card ID as text, max brightness and screen kept awake
  while open, update `lastUsedAt`.
- Performance check against the §10 scenario (app start → barcode ≤ 2 s); first quality scenario
  written into arc42 §10.
- Tests: render round-trip for every barcode type (ADR-0017 consequence).
- [DECIDED] `bwip-js` (ADR-0017). **[DECIDE]** plugins for brightness / keep-awake.

### Step 4 – Camera scanning (F-02, F-13; ADR-0010, ADR-0017)

- Infrastructure: ML Kit scanner adapter; mapping ML Kit formats → `BarcodeType`.
- UI: scan button → camera → editor pre-filled with value and type; permission denied handling.
- Final check of the supported barcode list against the plugin; ADR-0017 updated.
- [DECIDED] Plugin `@capacitor-mlkit/barcode-scanning`.

### Step 5 – Export and import, own format (F-05, F-11, quality goal 3; ADR-0004)

- Format specification in `docs/` (versioned JSON + photos folder in a ZIP, optional AES-256
  password).
- Domain: `ExportService` / `ImportService`, overwrite-by-id import and "clean import" setting.
- Infrastructure: ZIP library adapter, Android file picker / share sheet adapter.
- Tests: export → import round trip, wrong password, newer format version, clean vs. normal import.
- [DECIDED] ZIP library `@zip.js/zip.js` with AES-256 (ADR-0004). **[DECIDE]** file picker plugin.

### Step 6 – Card details: tags, color, icon, links, shop search (F-06, F-07, F-12; ADR-0005)

- Tags (filter in list), color and icon, homepage URL and extra websites (open in browser).
- Shop search: build a `geo:0,0?q=<search term>` intent so the user's map app opens
  (Google Maps or an OSM app); no location permission.
- Tests: URL validation, search term default (= store name), intent URL building.

### Step 7 – Photos (F-09; ADR-0003)

- Take/choose photos (front/back/other), store as compressed files in the app sandbox,
  reference from SQLite, include in export (Step 5 format already has the folder).
- Risk mitigation for the Auto Backup quota (arc42 §11.1): size limit/compression.
- [DECIDED] Camera plugin `@capacitor/camera`. **[DECIDE]** max photo size.

### Step 8 – Catima compatibility (F-11; ADR-0004, ADR-0007)

- Clean-room: implemented from real Catima export files only. The observed format is described in
  [formats/catima-export.md](formats/catima-export.md); tests use synthetic fixtures (the sample
  contains personal data). A second sample covering the "not yet observed" items is needed.
- Domain: `CatimaMapper` (both directions), documented field mapping.
- Tests: import of sample files, export → re-import, unsupported fields reported.

### Step 9 – Lock-screen tile (F-08, optional; ADR-0006)

- Spike on a device first (risk in arc42 §11.1).
- Native Kotlin plugin: Quick Settings tile + minimal Activity over the lock screen showing
  pre-rendered barcode images of cards marked `showOnLockScreen`, favorites first, swipe between them.
- TypeScript side: render images on change, sync to the plugin; images excluded from Auto Backup.

### Step 10 – Release (N-01; ADR-0008)

- Answer Q-14 (tooling, tracks, trigger), signing with the upload key from GitHub Secrets,
  AAB build, Play upload, store listing, data safety form, privacy policy.
- Needs the Google Play developer account.

### Step 11 – Polish

- Settings page, dark mode, accessibility review, not-found route, error handling and user
  feedback (toasts), sorting options.

## 3. Out of scope for now

iOS, tablets, own backend / presets download (ADR-0015 keeps the option), translations other than
English (ADR-0012), scanning from images (ADR-0017).
