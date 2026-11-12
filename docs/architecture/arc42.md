# MyCards – Architecture Documentation (arc42)

> **Status: DRAFT for discussion.** Nothing in this document is decided unless it is marked
> **[DECIDED]**. Proposals are marked **[PROPOSAL]**, open points **[OPEN Q-n]**.
> Implementation steps must reference the section / ADR they are based on.

---

## 1. Introduction and Goals

### 1.1 Requirements Overview

Source: initial request by the product owner (2026-11-08).

| ID   | Requirement                                                                                          | Priority  |
|------|------------------------------------------------------------------------------------------------------|-----------|
| F-01 | Manage loyalty cards (create, edit, delete, list), comparable to Catima                              | Must      |
| F-02 | Scan a card's barcode with the device camera – the only scan source (no import from images/screenshots) | Must      |
| F-03 | Present a card's barcode quickly and readable for shop scanners                                      | Must      |
| F-04 | All data is stored locally on the device only                                                        | Must      |
| F-05 | Import and export of all data                                                                        | Must      |
| F-06 | Homepage URL per card, plus further websites                                                          | Must      |
| F-09 | Attach photos to a card (e.g. front/back)                                                            | Must      |
| F-10 | Create a card manually (enter number and barcode format without scanning)                            | Must      |
| F-11 | Import/export: user chooses own format or Catima-compatible format                                    | Must      |
| F-12 | Card fields: tags, icon, color, all fields Catima supports, homepage URL (ADR-0016)                   | Must      |
| F-13 | Support all barcode types that can be scanned (ML Kit) and rendered (ADR-0017)                        | Must      |
| F-07 | Search for the card's shop near the current location and show it in Google Maps or OpenStreetMap     | Must      |
| F-08 | Show barcodes of cards marked "show on lock screen" without unlocking; swipe between them, favorites first | Optional  |
| N-01 | Android app, distributed via Google Play Store                                                        | Must      |
| N-02 | Prefer TypeScript / web technology, avoid Java/Kotlin where possible                                  | Should    |

Remaining scope questions: see section 11.2.

### 1.2 Quality Goals

[DECIDED] Priority in table order (1 = highest), PO 2026-11-09.

| Priority | Quality goal   | Motivation                                                                 |
|----------|----------------|----------------------------------------------------------------------------|
| 1 | Speed of presentation  | At the checkout the card must be on screen within a few seconds            |
| 2 | Privacy                | No own backend; data leaves the device only via user export or Android Auto Backup (ADR-0014) |
| 3 | Data safety            | No loss of cards (app update, phone change) – via import/export            |
| 4 | Maintainability        | Single developer, TypeScript-centric code base                             |
| 5 | Offline capability     | Core features (show/scan card) work without network                        |

### 1.3 Stakeholders

| Role                     | Who        | Expectations                                    |
|--------------------------|------------|-------------------------------------------------|
| Product owner / developer| APG        | TypeScript stack, Play Store release            |
| End user                 | tbd        | Fast card presentation, privacy                 |
| Google Play              | –          | Policy compliance (target API, data safety form) |
| Cashier / shop scanner   | –          | Readable barcode (brightness, size, quiet zone) |

---

## 2. Architecture Constraints

| Constraint                                           | Source / status |
|------------------------------------------------------|-----------------|
| Platform: Android **phones** only – no iOS, no tablet-specific layouts | [DECIDED] PO, 2026-11-08 |
| Minimum Android version: **Android 14 (API level 34)** | [DECIDED] ADR-0011 |
| UI language English; texts prepared for later translation | [DECIDED] ADR-0012 |
| Distribution: Google Play Store (AAB, Play App Signing, target-API requirement, Data-safety form, privacy policy URL) | Request / Google policy – current values to be verified at release time |
| Language: TypeScript; Kotlin only where unavoidable (lock-screen plugin) | [DECIDED] ADR-0001 |
| Framework: Capacitor + Angular, Ionic UI components  | [DECIDED] ADR-0001, ADR-0002, ADR-0009 |
| No own backend / cloud storage of user data. Exception accepted by PO: Android Auto Backup to the user's Google account stays enabled | Request (F-04), ADR-0014 |
| License: GPL-3.0-or-later                            | [DECIDED] ADR-0007 |
| Clean-room: **no code is copied from Catima** (or other card apps). Only Catima's export file format is implemented for compatibility. | [DECIDED] ADR-0007 |
| Documentation in Markdown, kept in this repository   | [DECIDED] PO, 2026-11-08 |
| Releases are built and published via GitHub Actions  | [DECIDED] ADR-0008 |

---

## 3. System Scope and Context

### 3.1 Business Context

```mermaid
flowchart LR
  User((User)) -->|manages / shows cards| App[Loyalty Card App]
  App -->|barcode on screen| Scanner[Shop scanner]
  App -->|export file| Files[(File / Share target)]
  Files -->|import file| App
  App -->|open search / URL| Maps[Google Maps / OSM app or site]
  App -->|open URL| Browser[Web browser]
```

### 3.2 Technical Context

| Neighbour             | Interface                                                         | Status |
|-----------------------|-------------------------------------------------------------------|--------|
| Camera                | Native camera + Google ML Kit barcode scanning                      | [DECIDED] ADR-0010 |
| Local storage         | SQLite + photo files in app sandbox                                 | [DECIDED] ADR-0003 |
| File system           | Android Storage Access Framework / share sheet for import/export    | [PROPOSAL] ADR-0004 |
| Google backup         | Android Auto Backup of app data to the user's Google account        | [DECIDED] ADR-0014 |
| Map apps              | Android intent with search query, user's map app (Google Maps, Organic Maps, OsmAnd, …) | [DECIDED] ADR-0005 |
| Location service      | Not used by the app (map app determines location)                  | [DECIDED] ADR-0005 |
| Lock screen           | Quick-Settings tile → native Activity shown over the lock screen     | [DECIDED] ADR-0006 |
| Google Play           | Play Developer API, used by GitHub Actions for uploads              | [DECIDED] ADR-0008 |
| Internet              | Permission kept; not used by current features. Possible future: download card presets from a backend (idea only) | [DECIDED] ADR-0015 |

---

## 4. Solution Strategy

### 4.1 App technology – options

**[DECIDED] Option A – Capacitor, with Angular as UI framework** (ADR-0001, ADR-0002). Table kept for reference.

| Option | Description | TypeScript share | Barcode scan | Lock-screen (F-08) | Play Store | Remarks |
|--------|-------------|------------------|--------------|--------------------|------------|---------|
| **A. Capacitor** (+ React/Vue/Svelte/Angular) | Web app in an Android WebView, native plugins | ~100 % app code; small Kotlin plugin only for special features | Community plugins (ML Kit based) | Requires a small custom native plugin | Native AAB via Gradle | Closest to "TypeScript web application"; also runs in browser for dev |
| **B. React Native / Expo** | TS code, native UI components | ~100 % app code; native modules via Expo Modules API (Kotlin) for special features | `expo-camera` has built-in barcode scanning | Requires a custom native module / config plugin | AAB via EAS Build or local Gradle | Native look & performance; React only; not a "web app" |
| **C. PWA + Trusted Web Activity** (Bubblewrap) | Installable web app wrapped for Play | 100 % | Web `BarcodeDetector` / JS decoder (zxing-js) | **Not possible** | Possible, but requires hosting the PWA on an own domain (Digital Asset Links) | Data in browser storage (IndexedDB) – can be wiped with browser data; weakest fit for F-04/F-08 |
| D. NativeScript | TS with direct access to Android APIs | 100 % (native APIs called from TS) | Plugins | Possible from TS | AAB | Smaller community/ecosystem |
| E. Tauri 2 (mobile) | Web UI + Rust core | UI only | Official barcode plugin | Native code (Kotlin/Rust) | AAB | Adds Rust instead of Kotlin |

Note: F-08 (lock screen) needs a small amount of Kotlin in every option – there is no
pure-TypeScript way on Android to render on/over the lock screen.

### 4.2 Other strategy decisions (to be discussed)

| Topic | Options | Proposal |
|-------|---------|----------|
| UI framework | Angular with Ionic Framework components first | [DECIDED] ADR-0002, ADR-0009 |
| Barcode scanning | Google ML Kit | [DECIDED] ADR-0010 |
| Persistence | SQLite plugin · key-value (Preferences) · JSON file in app sandbox | [DECIDED] SQLite for card data, photos as files in the app sandbox referenced from SQLite (ADR-0003) |
| Barcode rendering | `bwip-js` (many formats incl. Aztec, PDF417, DataMatrix) · `zxing` | [PROPOSAL] `bwip-js`, renders offline (ADR-0017) |
| Export format | User chooses: own format (ZIP, optional password) or Catima format; import replaces, no merge | [DECIDED] ADR-0004 |
| Nearby shop search | Open external map app with search query – no location permission, no API key | [DECIDED] ADR-0005 |
| Lock-screen display | Quick-Settings tile → separate native Activity with pre-rendered barcode images, marked cards only, swipe, favorites first | [DECIDED] ADR-0006 |
| Build & release | GitHub Actions building signed AAB + upload to Google Play | [DECIDED] ADR-0008. Tooling open [OPEN Q-14] |

---

## 5. Building Block View

*Draft, depends on section 4 decisions.*

```mermaid
flowchart TB
  subgraph UI[UI layer - TypeScript]
    CardList[Card list / search / sorting]
    CardDetail[Card detail / barcode view]
    CardEdit[Card editor]
    Scan[Scan screen]
    Settings[Settings / import-export]
  end
  subgraph Domain[Domain layer - TypeScript, framework independent]
    CardService
    ImportExport[Import/Export service]
    ShopLocator[Shop locator]
    BarcodeRenderer
  end
  subgraph Infra[Platform adapters]
    Repo[Card repository - storage]
    CameraScan[Barcode scanner adapter]
    FileAdapter[File / share adapter]
    MapAdapter[Map / URL launcher]
    LockScreen[Lock-screen adapter - native]
  end
  UI --> Domain --> Infra
```

[DECIDED] Domain logic is plain TypeScript with adapter interfaces, so it is unit-testable without a
device and independent of the chosen framework.

### 5.1 Domain model (draft, see ADR-0016)

| Entity   | Attributes |
|----------|------------|
| Card     | id, store name, card ID (number shown to humans), barcode value (if different from card ID), barcode type, note, valid from, expiry date, balance + balance type/currency, color, icon, favorite, archived, showOnLockScreen, homepage URL, shop search term (default = store name), created/updated, last used |
| Tag      | id, name (n:m with Card; corresponds to Catima groups) |
| Website  | id, cardId, label, URL (further links besides the homepage) |
| Photo    | id, cardId, role (front/back/icon/other), file reference |

The exact Catima field list is verified against real Catima export files before implementation
(ADR-0016).

### 5.2 Source code structure

The layers above map to folders under `src/app/`:

| Folder | Layer | Content |
|--------|-------|---------|
| `domain/model/` | Domain | Entities and value types (ADR-0016, ADR-0017) |
| `domain/ports/` | Domain | Adapter interfaces, e.g. `CardRepository` (ADR-0003) |
| `domain/services/` | Domain | Framework-independent logic, e.g. card ordering |
| `infrastructure/` | Platform adapters | Implementations of the ports (SQLite, scanner, files, maps); added with the first adapter |
| `ui/pages/` | UI | Ionic pages (ADR-0009) |
| `i18n/` | UI | Transloco loader; translations in `src/assets/i18n/` (ADR-0012) |

Test helpers shared by unit tests (data builders, in-memory port fakes) live in `src/testing/`.

ESLint enforces that `domain/` imports neither Angular, Ionic, Capacitor or Transloco nor the
`ui/` or `infrastructure/` folders. The native Android project lives in `android/`
(Capacitor, minSdk 34, ADR-0011).

---

## 6. Runtime View

*To be detailed after decisions.* Planned scenarios:

1. Add card by scanning
2. Show card at checkout (incl. max brightness / keep screen on / orientation)
3. Export all data → file / share target
4. Import data (merge vs. replace, duplicates)
5. Find nearby shop → open map
6. Show card on lock screen (optional)

---

## 7. Deployment View

*Draft.*

- [DECIDED] Application ID: `de.orisian.apps.mycards` (cannot change after the first Play upload).
- Artifact: Android App Bundle (AAB), signed with an upload key; Play App Signing.
- Channels: internal testing → closed testing → production. (Google requires closed testing with a
  minimum number of testers for new personal developer accounts before production – verify current
  rules.)
- Source hosting: GitHub repository `mycards`.
- CI/CD: GitHub Actions – build, test, sign (upload key from GitHub Secrets), upload AAB to a Play
  track (ADR-0008). Note: the very first upload of a new app is usually done manually in the Play
  Console – verify when the developer account exists.

---

## 8. Cross-cutting Concepts (to be filled)

- Privacy & permissions: camera; no location permission (ADR-0005); internet kept (ADR-0015); no app lock (ADR-0013)
- Data model versioning & migrations, export format versioning
- Error handling, logging (no remote telemetry?)
- Internationalization: English only at first, all UI texts externalized for later translation (ADR-0012)
- Accessibility, dark mode
- Testing strategy (unit tests for domain, E2E on emulator)
- Android Auto Backup enabled (ADR-0014); regenerable files (e.g. lock-screen images) excluded

---

## 9. Architecture Decisions

Decisions are recorded as ADRs in [`adr/`](adr/) (template: [`0000-template.md`](adr/0000-template.md)).

| ADR | Topic | Status |
|-----|-------|--------|
| [0001](adr/0001-app-technology-capacitor.md) | App technology: Capacitor | accepted |
| [0002](adr/0002-ui-framework-angular.md) | UI framework: Angular | accepted |
| [0003](adr/0003-persistence.md) | Persistence: SQLite + photo files | accepted |
| [0004](adr/0004-import-export-format.md) | Import/export: own ZIP format or Catima format | accepted |
| [0005](adr/0005-shop-search-external-map-app.md) | Shop search via external map app | accepted |
| [0006](adr/0006-lock-screen-quick-settings-tile.md) | Lock screen via Quick-Settings tile + native Activity | accepted |
| [0007](adr/0007-license-and-clean-room.md) | License GPL v3, no code reuse from Catima | accepted |
| [0008](adr/0008-release-via-github-actions.md) | Releases via GitHub Actions | accepted (tooling open) |
| [0009](adr/0009-ui-components-ionic.md) | UI components: Ionic Framework | accepted |
| [0010](adr/0010-barcode-scanning-ml-kit.md) | Barcode scanning: Google ML Kit | accepted |
| [0011](adr/0011-minimum-android-14.md) | Minimum Android 14 (API 34) | accepted |
| [0012](adr/0012-language-english-i18n-ready.md) | English UI, prepared for translation | accepted |
| [0013](adr/0013-no-app-lock.md) | No app lock (PIN/biometric) | accepted |
| [0014](adr/0014-android-auto-backup-enabled.md) | Android Auto Backup enabled | accepted |
| [0015](adr/0015-keep-internet-permission.md) | Keep INTERNET permission | accepted |
| [0016](adr/0016-card-data-model.md) | Card data model (Catima fields + tags, icon, color, homepage) | accepted |
| [0017](adr/0017-barcode-types-and-input.md) | All barcode types; camera-only scanning | accepted |

---

## 10. Quality Requirements

*To be derived from the prioritized quality goals in section 1.2.* Example scenario: "From app start to barcode on
screen for a pinned card: ≤ 2 s on a mid-range device."

---

## 11. Risks, Technical Debt and Open Questions

### 11.1 Risks

| Risk | Mitigation |
|------|------------|
| Auto Backup has a per-app size quota (documented by Google as 25 MB); many photos may exceed it and the backup then stops | Compress/limit photo size; exclude regenerable files; manual export remains the primary backup |
| ML Kit depends on Google libraries/Play services – app not suitable for F-Droid / de-Googled devices | Accepted (ADR-0010) |
| Lock-screen feature needs native Kotlin and may behave differently across vendors / Android versions | Keep it optional, isolate in a small plugin, prototype (spike) early on real devices |
| Lock-screen screen could expose more than intended (e.g. whole app reachable without unlock) | Separate minimal Activity that only shows barcodes (ADR-0006) |
| Catima format changes or is under-specified | Version detection, tests with real Catima exports, compatibility mode documented separately |
| Accidental GPL/copyright issues from copying Catima code | Clean-room rule (ADR-0007), PR review |
| ML Kit barcode scanning depends on Google Play services (unbundled model) or increases APK size (bundled model) | Decide in ADR; ZXing as fallback |
| Data loss on uninstall (local only) | Prominent export, reminders? |
| Play policy changes (target API level yearly) | CI keeps SDK versions up to date |

### 11.2 Open Questions

Answered questions are removed and recorded as ADRs.

| ID | Question |
|----|----------|
| Q-14 | Release tooling: Gradle Play Publisher, fastlane supply, or a GitHub Action; which tracks get automatic uploads (internal only / production)? Release trigger (tag, manual)? |

---

## 12. Glossary

| Term | Definition |
|------|------------|
| Card | A loyalty / membership / customer card represented by a barcode |
| AAB | Android App Bundle – Play Store upload format |
| TWA | Trusted Web Activity – Chrome-based wrapper to publish a PWA on Play |
| ADR | Architecture Decision Record |
