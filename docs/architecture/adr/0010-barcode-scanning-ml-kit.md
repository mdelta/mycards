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
- Plugin choice and bundled vs. Play-services-provided model are decided at implementation and
  documented here.
- Barcode *rendering* (showing a card) is independent of scanning (arc42 4.2).
