# ADR-0017: Barcode types and input

- Status: accepted
- Date: 2026-11-08
- arc42 reference: 1.1 (F-02, F-10, F-13), 4.2

## Decision

- **Scanning only via the camera** (ML Kit, ADR-0010). No import of barcodes from images,
  screenshots or PDFs.
- Manual card creation (F-10) remains possible: the user enters the card ID and selects the
  barcode type.
- **All barcode types** are supported – i.e. every type ML Kit can scan. According to ML Kit's
  documentation these are: Codabar, Code 39, Code 93, Code 128, EAN-8, EAN-13, ITF, UPC-A, UPC-E,
  Aztec, Data Matrix, PDF417, QR Code (verify against the plugin version used).
- [DECIDED] Rendering with `bwip-js`, which supports all types above.

## Implementation (step 3)

- `BarcodeRenderer` is a domain port; `BwipBarcodeRenderer` (infrastructure) maps each type to its
  `bwip-js` symbology and renders SVG. Code 93 is drawn as *Code 93 extended* so that all printable
  ASCII can be encoded; a Codabar value without start/stop characters gets `A…A`.
- Before saving, the domain checks that the barcode value (or the card ID if no barcode value is set)
  fits the type: allowed characters, length and, for EAN/UPC, the check digit. EAN/UPC values may
  omit the check digit; the renderer adds it. 2D codes accept any non-empty text.
- [DECIDED] While a card is shown, a `PresentationMode` port sets maximum brightness and keeps the
  screen on, implemented with `@capacitor-community/screen-brightness` and
  `@capacitor-community/keep-awake`. Both only affect the app's own window; leaving the screen
  restores the user's brightness. Plugin failures never block showing the barcode.

## Consequences

- Every supported type needs a scan → store → render round-trip test.
- Catima import accepts all Catima barcode types; unsupported values are reported to the user.
