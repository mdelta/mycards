# MyCards export format (own format), version 1

Specification of the file written by **Export** and read by **Import** (F-05, F-11, ADR-0004).
Implementation: `src/app/domain/services/backup-document.ts` and
`src/app/infrastructure/backup/zipjs-archive-codec.ts`.

## Container

- A ZIP file, named `mycards-YYYY-MM-DD.zip` (UTC date of the export).
- Entries:

  | Entry          | Content                                                         |
  | -------------- | --------------------------------------------------------------- |
  | `mycards.json` | The document described below, UTF-8.                            |
  | `photos/…`     | Reserved for card photos (step 7). Version 1 writes no photos. |

  Import ignores all other entries.
- **Optional password:** if the user sets a password, every entry is encrypted with WinZip AES-256
  (ZIP compression method 99). Legacy ZipCrypto is never written. Without a password, entries are
  stored unencrypted. Entry names are not encrypted (a ZIP limitation); they contain no card data.

## Document `mycards.json`

```json
{
  "format": "mycards-backup",
  "version": 1,
  "exportedAt": "2026-11-14T12:00:00.000Z",
  "cards": [
    {
      "id": "0b5c…",
      "storeName": "Bakery",
      "cardId": "4006381333931",
      "barcodeType": "EAN_13",
      "favorite": true,
      "archived": false,
      "showOnLockScreen": false,
      "createdAt": "2026-11-01T10:00:00.000Z",
      "updatedAt": "2026-11-02T10:00:00.000Z"
    }
  ]
}
```

| Field        | Type    | Meaning                                                              |
| ------------ | ------- | -------------------------------------------------------------------- |
| `format`     | string  | Always `mycards-backup`.                                             |
| `version`    | integer | Format version, currently `1`. Increased on incompatible changes.    |
| `exportedAt` | string  | ISO 8601 UTC time of the export. Informational.                      |
| `cards`      | array   | All cards, including archived ones.                                  |

### Card

The fields of the domain model (ADR-0016). Optional fields are omitted when empty.

| Field              | Type    | Required | Notes                                                          |
| ------------------ | ------- | -------- | -------------------------------------------------------------- |
| `id`               | string  | yes      | Unique within the file; the matching key for import.           |
| `storeName`        | string  | yes      | Not blank.                                                     |
| `cardId`           | string  | yes      | Not blank.                                                     |
| `barcodeValue`     | string  | no       | Only if it differs from `cardId`.                              |
| `barcodeType`      | string  | no       | One of the 13 types of ADR-0017, e.g. `QR_CODE`, `EAN_13`.     |
| `note`             | string  | no       |                                                                |
| `validFrom`        | string  | no       | Date `YYYY-MM-DD`.                                             |
| `expiry`           | string  | no       | Date `YYYY-MM-DD`, not before `validFrom`.                     |
| `balance`          | number  | no       | Not negative.                                                  |
| `balanceType`      | string  | no       | E.g. `EUR`, `points`.                                          |
| `color`            | string  | no       |                                                                |
| `icon`             | string  | no       |                                                                |
| `favorite`         | boolean | yes      |                                                                |
| `archived`         | boolean | yes      |                                                                |
| `showOnLockScreen` | boolean | yes      |                                                                |
| `homepageUrl`      | string  | no       |                                                                |
| `shopSearchTerm`   | string  | no       |                                                                |
| `createdAt`        | string  | yes      | ISO 8601 UTC.                                                  |
| `updatedAt`        | string  | yes      | ISO 8601 UTC.                                                  |
| `lastUsedAt`       | string  | no       | ISO 8601 UTC.                                                  |

Tags, extra websites and photos are not part of version 1; they are added with steps 6 and 7.
Adding optional fields does not change the version.

## Import rules

- The whole file is validated first. If any card is invalid (wrong types, unknown barcode type, a
  value that does not fit its barcode type, negative balance, duplicate `id`), nothing is imported.
- Unknown fields are ignored, so files from a newer app with only additional fields still import.
- `version` greater than the app supports: rejected with "created by a newer version".
- Encrypted file: the app asks for the password and asks again after a wrong one.
- **Normal import:** each card replaces the stored card with the same `id` completely; all other
  stored cards stay unchanged.
- **Clean import** (switch on the export/import screen): all stored cards are deleted and replaced by
  the cards from the file.
- Both run in one database transaction: on error, the stored cards are unchanged.
