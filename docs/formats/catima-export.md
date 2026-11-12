# Catima export format (observed)

> Clean-room note (ADR-0007): this description comes only from inspecting an export file the
> product owner created with Catima (2026-11-12, three cards). No Catima source code was read.
> The sample contains personal data and is **not** committed; tests use synthetic fixtures that
> follow this description.

## Container

- ZIP file (`catima_<yyyyMMdd>.zip`), deflate, no password in the observed sample.
- Entries:
  - `catima.csv` – all structured data.
  - `card_<id>_front.png`, `card_<id>_back.png` – optional photos per card (`<id>` = `_id` of the
    card). Observed as full-resolution PNGs (2–4 MB each).

## `catima.csv`

- Line endings CRLF, comma-separated, header row per section.
- The file consists of a version line followed by sections separated by empty lines:

```text
2                          <- format version
                           <- empty line
_id                        <- section 1: groups (header only in the sample)
                           <- empty line
_id,store,note,...,archive <- section 2: cards
<card rows>
                           <- empty line
cardId,groupId             <- section 3: card ↔ group links (header only in the sample)
```

### Card columns

| Column | Observed values | Meaning / mapping to `Card` (ADR-0016) |
|--------|-----------------|----------------------------------------|
| `_id` | `1`, `2`, `3` | Catima card id → matching key on import (ADR-0004); photo file names |
| `store` | `Lohners` | `storeName` |
| `note` | empty, `note` | `note` |
| `validfrom` | empty, `1794528000000` | Unix time in **milliseconds** → `validFrom` |
| `expiry` | empty, `1795046400000` | Unix time in **milliseconds** → `expiry` |
| `balance` | `0`, `1.23` | Decimal with `.` → `balance` (`0` = no balance?) |
| `balancetype` | empty, `EUR` | Currency code → `balanceType` |
| `cardid` | `CPENYPYK` | `cardId` |
| `barcodeid` | empty | Barcode value if different from `cardid` → `barcodeValue` |
| `barcodetype` | `ITF`, `QR_CODE` | Same names as our `BarcodeType` in the sample |
| `barcodeencoding` | `ISO-8859-1` | Text encoding of the barcode; no counterpart yet |
| `headercolor` | `-769226` | Signed 32-bit ARGB integer (`-769226` = `#FFF44336`) → `color` |
| `starstatus` | `0` | `1` = favorite (assumed) → `favorite` |
| `lastused` | `1794506289` | Unix time in **seconds** (unlike the date columns) → `lastUsedAt` |
| `archive` | `0` | `1` = archived (assumed) → `archived` |

Observed: the dates `validfrom`/`expiry` were midnight UTC of the chosen day.

## Not yet observed

These need another sample export before the mapping is final:

- Group rows and card ↔ group link rows (→ `Tag`/`tagIds`); group columns besides `_id`.
- `starstatus = 1`, `archive = 1`, a non-empty `barcodeid`, other `barcodeencoding` values.
- Card icon images (if Catima exports them) and their file name.
- Values containing commas, quotes or line breaks (CSV quoting).
- Password-protected exports.
