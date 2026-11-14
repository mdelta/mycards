# ADR-0013: No app lock

- Status: accepted
- Date: 2026-11-08
- arc42 reference: 8

## Decision

The app opens **without PIN or biometric authentication**.

## Consequences

- Fastest access at the checkout; device lock is the only protection.
- Can be added later as an optional setting if needed.
- The `USE_BIOMETRIC` / `USE_FINGERPRINT` permissions that `androidx.biometric` (a dependency of
  `@capacitor-community/sqlite`) adds to the merged manifest are removed with
  `tools:node="remove"`; the plugin's optional biometric feature is not used.
