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
- Fields without a Catima counterpart (e.g. homepage URL, further websites, lock-screen flag) are
  lost in Catima export; this is shown to the user.
