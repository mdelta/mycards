# ADR-0011: Minimum Android version 14

- Status: accepted
- Date: 2026-11-08
- arc42 reference: 2

## Decision

Minimum supported version: **Android 14 (API level 34)** (`minSdkVersion 34`). The target SDK
follows Google Play's current requirement.

## Consequences

- Modern APIs (e.g. Quick-Settings tile and lock-screen behaviour, photo picker) can be used
  without compatibility code for older versions.
- Devices running Android 13 or older cannot install the app.
