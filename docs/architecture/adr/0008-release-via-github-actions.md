# ADR-0008: Releases via GitHub Actions

- Status: accepted (tooling open, arc42 Q-14)
- Date: 2026-11-08
- arc42 reference: 7

## Context

The app is distributed via Google Play. Releases shall be done via GitHub CI. A Play developer
account does not exist yet.

## Decision

GitHub Actions builds the Angular app, syncs Capacitor, builds a signed Android App Bundle (AAB)
and uploads it to a Google Play track.

## Consequences

- Upload keystore and Play service-account credentials are stored as GitHub Secrets – never in the
  repository. Play App Signing is used.
- Requires: Play developer account, app entry in the Play Console, service account with API
  access. The first upload is likely manual (to be verified).
- Open (Q-14): tool (Gradle Play Publisher, fastlane supply, or a GitHub Action), which tracks are
  uploaded automatically, versioning scheme (versionCode from CI run / tags).
