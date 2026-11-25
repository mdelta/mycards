# ADR-0019: Settings, privacy policy and licenses

- Status: accepted
- Date: 2026-11-25
- arc42 reference: 5, 8

## Context

R-4 asks for a settings page with color theme, privacy notes, source code link, licenses and app
version. Google Play requires a privacy policy at a public URL with a contact. GPL-3.0 and the
licenses of bundled libraries require showing third-party licenses, including the native Android
libraries (ML Kit, AndroidX, SQLCipher etc.), which Angular's license list doesn't cover.

## Options

- Settings storage: (a) `@capacitor/preferences`; (b) a table in the card database.
- Native licenses: (a) AboutLibraries Gradle plugin; (b) hand-maintained list; (c) Google's
  `play-services-oss-licenses` screen, which needs Kotlin.
- Public privacy policy: (a) GitHub Pages from `docs/`; (b) a link to the Markdown file on GitHub.

## Decision

- [DECIDED] **Settings in `@capacitor/preferences`** (MIT, no permissions), separate from card data.
  Settings are **not** part of MyCards or Catima exports. Android Auto Backup still includes them.
- [DECIDED] **Theme:** system (default), light or dark, via Ionic's `ion-palette-dark` class.
- [DECIDED] **App version** from `@capacitor/app` (MIT, no permissions).
- [DECIDED] **Licenses on one screen:** the AboutLibraries Gradle plugin (Apache-2.0) exports the
  native libraries of the release variant to `src/assets/licenses/android-libraries.json`
  (`npm run licenses:android`, committed; CI fails if it is outdated). JavaScript libraries come
  from Angular's `3rdpartylicenses.txt`, written by production builds only.
- [DECIDED] **Privacy policy:** single source `docs/privacy.md`, published with GitHub Pages from
  `docs/` on `main` (only this file, see `docs/_config.yml`) and shown in the app from the same
  file. Contact: privacy-policy@orisian.de.

## Consequences

- Upgrading native dependencies requires running `npm run licenses:android`.
- The in-app policy renders a small Markdown subset (headings, paragraphs, lists, links) without
  HTML, so `docs/privacy.md` must stay within that subset.
- The policy must be updated with every change to data handling, e.g. R-B (Sentry, ADR-0018).
- The repository owner enables GitHub Pages once; URL: <https://mdelta.github.io/mycards/privacy>.
