# ADR-0016: Card data model

- Status: accepted
- Date: 2026-11-08
- arc42 reference: 1.1 (F-06, F-09, F-12), 5.1

## Context

Cards need more than a barcode. Catima compatibility (ADR-0004) requires that Catima data can be
imported and exported without loss where possible.

## Decision

A card supports:

- **All fields Catima supports** – based on Catima's export format, e.g. store name, card ID,
  barcode value, barcode type, note, valid-from and expiry date, balance and balance type/currency,
  color, starred (favorite), archived, last used, groups and front/back/icon images.
  The definitive list is taken from real Catima export files before implementation (no Catima code
  is read or copied, ADR-0007).
- Additionally: **tags** (n:m; Catima groups map to tags), **icon**, **color**, **homepage URL**,
  further websites (F-06), photos (F-09), shop search term (ADR-0005), "show on lock screen" flag
  (ADR-0006).

## Consequences

- Domain model in arc42 section 5.1; DB schema (ADR-0003) and own export format (ADR-0004) follow it.
- [DECIDED] (step 6) **Color:** a fixed palette of 12 colors with white text contrast of at least
  4.5:1; without a chosen color, one is derived from the store name, so a card keeps its color.
  Stored as `#RRGGBB`, so imported colors outside the palette still display.
- [DECIDED] (step 6) **Icon:** the store's first letter on the card color by default; optionally an
  icon from a built-in list of Ionic icons (stored as its key). [DECIDED] (step 7) Or a custom
  image, stored as the card's photo with role `icon`; choosing a built-in icon or the letter removes
  it.
- [DECIDED] (step 7) **Photos:** front and back in the editor; the model also allows any number of
  `other` photos for later (ADR-0003).
- [DECIDED] (step 6) **Tags** are created in the card editor and filter the card list; tag names are
  unique ignoring case, and tags no card uses are deleted. **Websites** are an ordered list of
  optional label plus URL.
- Fields without a Catima counterpart (e.g. homepage URL, further websites, lock-screen flag) are
  lost in Catima export; this is shown to the user.
