# ADR-0020: Software bill of materials (SBOM) in CycloneDX format

- Status: accepted
- Date: 2026-11-26
- arc42 reference: 1.1 (N-03), 7

## Context

The PO wants an SBOM for MyCards (N-03), so that users and the developer can see which third-party
components ship in each build and check them against known vulnerabilities and licenses. The app
has two dependency sets: npm packages bundled into the web part (Angular, Ionic, Capacitor, Sentry,
bwip-js …) and native Android libraries resolved by Gradle (ML Kit, AndroidX, SQLite/SQLCipher,
Capacitor plugins' native code …).

## Options

- Format: (a) CycloneDX JSON; (b) SPDX JSON; (c) both.
- Scope: (a) one combined SBOM for npm and Gradle; (b) two separate files; (c) npm only.
- Publishing: (a) CI artifact on every build and attached to every GitHub release; (b) releases
  only; (c) CI artifact only.

## Decision

- **CycloneDX JSON** (PO decision). The CycloneDX project provides official generators for both
  ecosystems: `@cyclonedx/cyclonedx-npm` for npm and the `org.cyclonedx.bom` Gradle plugin for
  Android.
- **One combined SBOM** covering npm and the Android app's runtime dependencies (release runtime
  classpath), e.g. merged with the CycloneDX CLI. Development-only tools (test runners, linters)
  are excluded.
- **Published** as a CI artifact on every build and attached to every GitHub release, next to the
  AAB/APK of that release.
- **Must**, implemented with the release workflow in step 10.

## Consequences

- CI gets an SBOM job; the release workflow attaches the file to the GitHub release.
- Exact tool versions, the merge step and the npm/Gradle scopes are verified when step 10 is built.
- The SBOM lists components and licenses only; it contains no user or card data.
- The in-app license screen (ADR-0019) stays separate; it serves the license notices, the SBOM
  serves tooling.
