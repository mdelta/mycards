# ADR-0010: Barcode scanning – Google ML Kit

- Status: accepted
- Date: 2026-11-08
- arc42 reference: 3.2, 4.2

## Context

Cards are added by scanning their barcode with the camera (F-02). Options were Google ML Kit and
ZXing.

## Decision

Use **Google ML Kit** barcode scanning via a Capacitor plugin.

## Consequences

- Good recognition quality and speed; Google dependency accepted (app not targeted at F-Droid /
  de-Googled devices).
- [DECIDED] Plugin `@capacitor-mlkit/barcode-scanning` (pinned version) with Google's ready-made
  scanner UI (`scan()`, Google code scanner). The scanner runs in Google Play services, so the app
  declares **no `CAMERA` permission** and ships no own scanner screen or bundled model.
- The Google scanner module is provided by Play services and may be downloaded on first use
  (manifest meta-data `com.google.mlkit.vision.DEPENDENCIES = barcode_ui` requests it at install).
  While it is missing, the app starts the download and asks the user to try again.
- The scanner UI's look is fixed (no own overlay, torch button etc.). Devices without Play services
  cannot scan; manual entry (F-10) remains.
- Cancelling the scan returns to the card list without a message.
- Barcode *rendering* (showing a card) is independent of scanning (arc42 4.2).
