# ADR-0006: Lock-screen display via Quick-Settings tile

- Status: accepted (implementation variant open, arc42 Q-9)
- Date: 2026-11-08
- arc42 reference: 1.1 (F-08), 4.2, 11.1

## Context

Optional feature: show barcodes without unlocking the device. Android offers no TypeScript-only
way to display content on/over the lock screen.

## Decision

A **Quick-Settings tile** (Android `TileService`) opens a screen that is displayed over the lock
screen (Activity with "show when locked"). The user can swipe between barcodes; favorites come
first.

## Implementation variants (Q-9)

1. **[Proposal]** Separate minimal native Activity (Kotlin) that only displays barcode images.
   The TypeScript app renders the barcode images and writes them plus an ordered list to app
   storage whenever cards change. No other app functionality is reachable over the lock screen.
2. Start the Capacitor WebView in a restricted "lock mode". Less Kotlin, but higher risk of
   exposing the whole app without unlocking, and slower start.

## Consequences

- A small custom Capacitor plugin / Android component in Kotlin is required (accepted exception
  to the TypeScript preference).
- Barcodes of the displayed cards are visible to anyone holding the device – the feature must be
  opt-in, possibly per card.
- Behaviour of tiles and lock-screen activities varies between Android versions and vendors; an
  early prototype on real devices is planned.
