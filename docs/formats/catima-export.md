# Catima export format (observed)

> Clean-room note (ADR-0007): this description comes only from inspecting export files the product
> owner created with Catima (three samples, 2026-11-12 and 2026-11-16, up to eight cards). No Catima
> source code was read. The samples contain personal data and are **not** committed; tests use
> synthetic fixtures that follow this description.

## Container

- ZIP file (`catima_<yyyyMMdd>.zip`), deflate. Optionally password-protected: every entry is
  encrypted with WinZip AES-256, the same method as the own format (ADR-0004).
- Entries:
  - `catima.csv` – all structured data, UTF-8.
  - `card_<id>_front.png`, `card_<id>_back.png`, `card_<id>_icon.png` – optional images per card
    (`<id>` = `_id` of the card). Front/back were full-resolution PNGs (2–4 MB); the icon was not
    square (397 × 250).

## `catima.csv`

- RFC 4180 CSV: comma-separated, rows end with CRLF. A value containing a comma, a quote or a line
  break is enclosed in double quotes, with quotes doubled (`"note, with "" and"`). Line breaks inside
  a quoted value are LF. Values with a trailing space were quoted as well (`"with group "`).
- A version line, then three sections separated by empty lines:

```text
2                          <- format version
                           <- empty line
_id                        <- section 1: groups, one group name per row
group
                           <- empty line
_id,store,note,...,archive <- section 2: cards
<card rows>
                           <- empty line
cardId,groupId             <- section 3: card ↔ group links (card _id, group name)
7,group
```

### Card columns

| Column            | Observed values                                  | Meaning                                         |
| ----------------- | ------------------------------------------------ | ----------------------------------------------- |
| `_id`             | `1` … `8`, not in row order                      | Catima card id; used in image names and links   |
| `store`           | `Lohners`                                        | Store name                                      |
| `note`            | empty, `note`, multi-line text                   | Note                                            |
| `validfrom`       | empty, `1794528000000`                           | Unix time in **milliseconds**, midnight UTC     |
| `expiry`          | empty, `1795046400000`                           | Unix time in **milliseconds**, midnight UTC     |
| `balance`         | `0`, `1.23`, `33`                                | Decimal with `.`; `0` for cards without balance |
| `balancetype`     | empty, `EUR`                                     | Currency code                                   |
| `cardid`          | `CPENYPYK`                                       | Card ID                                         |
| `barcodeid`       | empty, `barcodevalue`                            | Barcode value if different from `cardid`        |
| `barcodetype`     | `ITF`, `QR_CODE`, `AZTEC`, `CODE_128`, `CODE_39` | Same names as our `BarcodeType`                 |
| `barcodeencoding` | `ISO-8859-1`, `UTF-8`                            | Text encoding of the barcode                    |
| `headercolor`     | `-769226`                                        | Signed 32-bit ARGB (`-769226` = `#FFF44336`)    |
| `starstatus`      | `0`, `1`                                         | `1` = favorite                                  |
| `lastused`        | `1794506289`                                     | Unix time in **seconds**                        |
| `archive`         | `0`, `1`                                         | `1` = archived                                  |

## Mapping in MyCards (step 8)

Implementation: `src/app/domain/services/catima-format.ts`.

**Import**

- Every Catima card becomes a **new** card with a new id; a Catima import never replaces existing
  cards (ADR-0004). A clean import deletes all existing cards first.
- Groups become tags; a group whose name matches an existing tag (ignoring case) uses that tag.
- Text is trimmed like manual input; `0` balance without `balancetype` means no balance; dates become
  `YYYY-MM-DD`; `headercolor` becomes `#RRGGBB` (alpha dropped); `lastused` `0` means never used.
- A barcode type MyCards does not support, or a value that does not fit its type (e.g. lowercase
  letters in `CODE_39` are supported via Code 39 extended), is imported without barcode type; the app lists these cards afterwards.
- Front/back images are shrunk like MyCards photos (≤ 1600 px, JPEG 80 %); the icon image is
  cropped to the centered square (256 px). An image that cannot be decoded is skipped.
- `barcodeencoding` is ignored (MyCards encodes non-Latin-1 text as UTF-8, ADR-0017).

**Export**

- Cards get Catima ids `1`, `2`, … in list order; all tags become groups.
- `headercolor` is the card color with full alpha; `lastused` falls back to the last change;
  `barcodeencoding` is `ISO-8859-1` if the barcode value fits Latin-1, else `UTF-8`.
- Front, back and icon photos are written as PNG; `other` photos are not exported.
- Homepage, extra websites, built-in icons, shop search terms and "show on lock screen" have no
  Catima counterpart. The app lists the affected fields and asks before exporting.

## Not yet observed

- More than one group, and group names containing commas.
- Barcode types other than those listed above.
- Whether Catima can read `CODE_39` values with lowercase letters back (one sample contained one).
