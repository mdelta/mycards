# MyCards – Implementation Plan

> **Status: DRAFT for discussion.** Order and scope are proposals until the product owner approves
> them. Each step is one (or a few) pull requests that reference the arc42 sections and ADRs they
> implement. Points that need a decision are marked **[DECIDE]**.

## 1. Development principles

| Principle                      | How it is applied                                                                                                                                                                                                                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TDD                            | Domain services, mappers, format readers/writers and validators are written test-first (red → green → refactor). UI and thin platform adapters are tested after the fact where TDD adds little.                                                                                                                                             |
| SOLID / separation of concerns | Layers from arc42 §5.2. The domain defines ports (interfaces); infrastructure implements them; UI only talks to domain services. Ports are bound to adapters with Angular `InjectionToken`s (dependency inversion), so tests can use in-memory fakes. One service per responsibility (e.g. `CardService`, `ExportService`, `CatimaMapper`). |
| Thin UI                        | Pages are containers that call services; reusable components are presentational (inputs/outputs only). No business rules in templates or pages.                                                                                                                                                                                             |
| Unit test coverage             | Soft goal: ≥ 80 % line coverage. CI measures coverage with Vitest (`@vitest/coverage-v8`) and shows it in the job summary. [DECIDED] CI only reports coverage and never fails because of it.                                                                                                                                                |
| Test pyramid                   | Many unit tests (Vitest), a few Playwright e2e flows against the web build, and a manual device checklist for native features (camera, lock screen, brightness).                                                                                                                                                                            |
| Definition of done per step    | Tests written/updated, lint + coverage green in CI, arc42/ADR updated if a decision changed, PR cites arc42/ADR.                                                                                                                                                                                                                            |

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
- [DECIDED] `bwip-js` (ADR-0017); `@capacitor-community/screen-brightness` and
  `@capacitor-community/keep-awake` behind a `PresentationMode` port (ADR-0017).

### Step 4 – Camera scanning (F-02, F-13; ADR-0010, ADR-0017)

- Infrastructure: ML Kit scanner adapter; mapping ML Kit formats → `BarcodeType`.
- UI: scan button → camera → editor pre-filled with value and type; ~~permission denied handling~~
  not needed: Google's scanner UI needs no camera permission. Instead: "scanner downloading" and
  "scan failed" messages; cancel returns silently.
- Final check of the supported barcode list against the plugin; ADR-0017 updated.
- [DECIDED] Plugin `@capacitor-mlkit/barcode-scanning` with the ready-made `scan()` UI (ADR-0010).

### Step 5 – Export and import, own format (F-05, F-11, quality goal 3; ADR-0004)

- Format specification in `docs/` (versioned JSON + photos folder in a ZIP, optional AES-256
  password).
- Domain: `BackupService` (export, read, restore), overwrite-by-id import and "clean import" setting.
- Infrastructure: ZIP library adapter, Android file picker / share sheet adapter.
- Tests: export → import round trip, wrong password, newer format version, clean vs. normal import.
- [DECIDED] ZIP library `@zip.js/zip.js` with AES-256 (ADR-0004).
- [DECIDED] Import via `@capawesome/capacitor-file-picker`; export via `@capacitor/filesystem` +
  `@capacitor/share` (share sheet only, no "Save as" dialog; ADR-0004).
- Format: [formats/mycards-backup.md](formats/mycards-backup.md). Photos (step 7) and tags (step 6)
  are added to the format in those steps.

### Step 6 – Card details: tags, color, icon, links, shop search (F-06, F-07, F-12; ADR-0005)

- Tags (filter in list), color and icon, homepage URL and extra websites (open in browser).
- Shop search: build a `geo:0,0?q=<search term>` intent so the user's map app opens
  (Google Maps or an OSM app); no location permission.
- Tests: URL validation, search term default (= store name), intent URL building.
- [DECIDED] Icon: first letter by default, or an icon from a built-in Ionic icon list; a custom
  image follows with photos in step 7. Color: fixed palette of 12 (ADR-0016).
- [DECIDED] `@capacitor/app-launcher` opens links and the map app, with an OpenStreetMap web
  fallback (ADR-0005).
- Export format version 2 adds tags and websites; version 1 files still import
  ([format spec](formats/mycards-backup.md)).

### Step 7 – Photos (F-09; ADR-0003)

- Take/choose photos (front/back/other), store as compressed files in the app sandbox,
  reference from SQLite, include in export (Step 5 format already has the folder).
- Risk mitigation for the Auto Backup quota (arc42 §11.1): size limit/compression.
- [DECIDED] Camera plugin `@capacitor/camera` (8.2.6; system camera app and photo picker, no
  permission).
- [DECIDED] Photos at most 1600 px on the longer edge, JPEG 80 %. Custom icon image (ADR-0016): the
  centered square at 256 px.
- [DECIDED] The editor offers front and back only; model, database and export already allow any
  number of further (`other`) photos.

### Step 8 – Catima compatibility (F-11; ADR-0004, ADR-0007)

- Clean-room: implemented from real Catima export files only. The observed format is described in
  [formats/catima-export.md](formats/catima-export.md); tests use synthetic fixtures (the sample
  contains personal data). [DECIDED] Three samples cover groups, favorites, archived cards, CSV
  quoting, icon images and passwords. A Catima import always adds new cards (ADR-0004).
- Domain: `CatimaMapper` (both directions), documented field mapping.
- Tests: import of sample files, export → re-import, unsupported fields reported.

### Step 9 – Lock-screen tile (F-08, optional; ADR-0006)

- Spike on a device first (risk in arc42 §11.1).
- Native Kotlin plugin: Quick Settings tile + minimal Activity over the lock screen showing
  pre-rendered barcode images of cards marked `showOnLockScreen`, favorites first, swipe between them.
- TypeScript side: render images on change, sync to the plugin; images excluded from Auto Backup.

### Before step 10 – New features (clarified)

Requested by the product owner and clarified before the release step.

| #   | Feature                    | Decision                                                                                                                                                                                                                                                   |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-1 | Opt-in usage data (Sentry) | [DECIDED] ADR-0018: Sentry on sentry.io, EU region; own switch, off by default; weekly summary of counts (cards, barcode types, tags, photos, used features), no card content; sent reports visible in the app.                                            |
| R-2 | "Buy me a coffee"          | [DEFERRED] Skipped for now (PO). Google Play's payments policy requires Play Billing for payments in the app and forbids in-app links to other payment methods, except tax-exempt donations.                                                               |
| R-3 | Opt-in crash reports       | [DECIDED] ADR-0018: same Sentry setup as R-1, separate switch, off by default; errors of the app's own code only (no native crashes, PO 2026-11-26).                                                                                                       |
| R-4 | Settings page              | [DECIDED] Theme (system, light, dark), the two switches and "Sent data" (R-1, R-3), privacy notes, source code link, licenses incl. third-party licenses, app version. Privacy policy also on a public page (GitHub Pages), as Google Play requires a URL. |
| R-5 | App logo                   | [DECIDED] Devin drafts three SVG concepts; the PO picks one; then adaptive icon (incl. monochrome layer), legacy launcher icons, 512 px Play icon and feature graphic.                                                                                     |
| R-6 | Play store text            | [DECIDED] English, factual and friendly; short (≤ 80 characters) and full description (≤ 4000 characters); drafted after R-1 to R-5 are built so it matches the app.                                                                                       |

### Step R-A – Settings page and privacy notes (R-4)

- Settings page with theme, privacy notes, source code link, licenses and app version.
- Privacy policy text in the app and on a public page.
- [DECIDED] Details in ADR-0019: settings in `@capacitor/preferences` and not exported; version via
  `@capacitor/app`; native licenses via the AboutLibraries Gradle plugin, shown with the JavaScript
  licenses on one screen; `docs/privacy.md` on GitHub Pages; contact privacy-policy@orisian.de.

### Step R-B – Opt-in crash reports and usage data (R-1, R-3; ADR-0018)

- `@sentry/browser`, loaded and started only when a switch is on; Angular `ErrorHandler` reports
  errors of the app's own code; no native crash reporting.
- Consent dialogs listing the sent data, weekly usage summary, local "Sent data" log (newest 20),
  allow-list and scrubbing tests that prove no card content is sent.
- [DECIDED] DSN from the `SENTRY_DSN` build variable (GitHub secret); switches hidden without it.
  Source-map upload follows in step 10. Details in ADR-0018.

### Step R-C – Logo and store listing (R-5, R-6)

- Logo concepts → chosen logo → all Android and Play sizes.
- Store listing draft for step 10.

### Step 10 – Release (N-01, N-03; ADR-0008, ADR-0020)

- Answer Q-14 (tooling, tracks, trigger), signing with the upload key from GitHub Secrets,
  AAB build with `SENTRY_DSN` and source-map upload to Sentry, Play upload, store listing, data safety form, privacy policy (both must declare
  Google ML Kit's usage metrics, ADR-0010, and the opt-in Sentry reports, ADR-0018).
- SBOM (N-03, ADR-0020): one combined CycloneDX JSON for npm and Gradle runtime dependencies, as CI
  artifact on every build and attached to every GitHub release.
- Needs the Google Play developer account.

### Step 11 – Polish

- Accessibility review, not-found route, error handling and user feedback (toasts), sorting
  options. The settings page and dark mode moved to R-4.

## 3. Out of scope for now

iOS, tablets, own backend / presets download (ADR-0015 keeps the option), translations other than
English (ADR-0012), scanning from images (ADR-0017).
