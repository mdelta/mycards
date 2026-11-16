# MyCards export format (own format), version 2

Specification of the file written by **Export** and read by **Import** (F-05, F-11, ADR-0004).
Implementation: `src/app/domain/services/backup-document.ts` and
`src/app/infrastructure/backup/zipjs-archive-codec.ts`.

## Container

- A ZIP file, named `mycards-YYYY-MM-DD.zip` (UTC date of the export).
- Entries:

  | Entry             | Content                                                        |
  | ----------------- | -------------------------------------------------------------- |
  | `mycards.json`    | The document described below, UTF-8.                           |
  | `photos/<id>.jpg` | One JPEG per photo listed in a card's `photos` (since step 7). |

  Import ignores all other entries.

- **Optional password:** if the user sets a password, every entry is encrypted with WinZip AES-256
  (ZIP compression method 99). Legacy ZipCrypto is never written. Without a password, entries are
  stored unencrypted. Entry names are not encrypted (a ZIP limitation); they contain no card data.

## Document `mycards.json`

```json
{
  "format": "mycards-backup",
  "version": 2,
  "exportedAt": "2026-11-14T12:00:00.000Z",
  "tags": [{ "id": "7f3a…", "name": "Food" }],
  "cards": [
    {
      "id": "0b5c…",
      "storeName": "Bakery",
      "cardId": "4006381333931",
      "barcodeType": "EAN_13",
      "favorite": true,
      "archived": false,
      "showOnLockScreen": false,
      "tagIds": ["7f3a…"],
      "websites": [{ "label": "Coupons", "url": "https://bakery.example.com/coupons" }],
      "createdAt": "2026-11-01T10:00:00.000Z",
      "updatedAt": "2026-11-02T10:00:00.000Z"
    }
  ]
}
```

| Field        | Type    | Meaning                                                           |
| ------------ | ------- | ----------------------------------------------------------------- |
| `format`     | string  | Always `mycards-backup`.                                          |
| `version`    | integer | Format version, currently `2`. Increased on incompatible changes. |
| `exportedAt` | string  | ISO 8601 UTC time of the export. Informational.                   |
| `tags`       | array   | All tags (since version 2).                                       |
| `cards`      | array   | All cards, including archived ones.                               |

### Tag

| Field  | Type   | Required | Notes                                                |
| ------ | ------ | -------- | ---------------------------------------------------- |
| `id`   | string | yes      | Same rules as the card `id`; unique within the file. |
| `name` | string | yes      | Not blank; unique within the file, ignoring case.    |

### Card

The fields of the domain model (ADR-0016). Optional fields are omitted when empty.

| Field              | Type    | Required | Notes                                                                                          |
| ------------------ | ------- | -------- | ---------------------------------------------------------------------------------------------- |
| `id`               | string  | yes      | 1–64 of `A–Z a–z 0–9 _ -`, not `new`; unique within the file; the matching key for import.     |
| `storeName`        | string  | yes      | Not blank.                                                                                     |
| `cardId`           | string  | yes      | Not blank.                                                                                     |
| `barcodeValue`     | string  | no       | Only if it differs from `cardId`.                                                              |
| `barcodeType`      | string  | no       | One of the 13 types of ADR-0017, e.g. `QR_CODE`, `EAN_13`.                                     |
| `note`             | string  | no       |                                                                                                |
| `validFrom`        | string  | no       | Date `YYYY-MM-DD`.                                                                             |
| `expiry`           | string  | no       | Date `YYYY-MM-DD`, not before `validFrom`.                                                     |
| `balance`          | number  | no       | Not negative.                                                                                  |
| `balanceType`      | string  | no       | E.g. `EUR`, `points`.                                                                          |
| `color`            | string  | no       | `#RRGGBB`. Omitted: derived from the store name (ADR-0016).                                    |
| `icon`             | string  | no       | Key from the app's icon list, e.g. `cafe`. Omitted or unknown: first letter.                   |
| `favorite`         | boolean | yes      |                                                                                                |
| `archived`         | boolean | yes      |                                                                                                |
| `showOnLockScreen` | boolean | yes      |                                                                                                |
| `homepageUrl`      | string  | no       | `http` or `https` URL.                                                                         |
| `shopSearchTerm`   | string  | no       | Omitted: the store name is searched (ADR-0005).                                                |
| `tagIds`           | array   | no       | Ids from `tags`, no duplicates. Omitted: no tags.                                              |
| `websites`         | array   | no       | Ordered list of `{ "label"?: string, "url": string }`; `url` is `http` or `https`.             |
| `photos`           | array   | no       | Ordered list of `{ "id": string, "role": "front" \| "back" \| "icon" \| "other" }`, see below. |
| `createdAt`        | string  | yes      | ISO 8601 UTC.                                                                                  |
| `updatedAt`        | string  | yes      | ISO 8601 UTC.                                                                                  |
| `lastUsedAt`       | string  | no       | ISO 8601 UTC.                                                                                  |

Adding optional fields does not change the version.

### Photo

- `id` follows the same rules as a card `id` and is unique in the whole file; the image is the entry
  `photos/<id>.jpg`, which must exist.
- `role`: `front` and `back` are the card's photos, `icon` is the custom icon image (a square). Each
  of these occurs at most once per card; `other` any number of times (the app does not create
  `other` photos yet).

### Version history

- **Version 2, extended** (step 7): optional card `photos` with `photos/<id>.jpg` entries.
- **Version 2** (step 6): top-level `tags`, card `tagIds` and `websites`. Version 1 files still
  import; their cards get no tags and no websites (fields of that name in a version 1 file are
  ignored).
- **Version 1** (step 5): cards only. Version 1 did not restrict `color` and `homepageUrl`;
  on import, a `color` that is not `#RRGGBB` and a `homepageUrl` that is not an `http(s)` URL are
  dropped.

## Import rules

- The whole file is validated first. If any card is invalid (wrong types, unknown barcode type, a
  value that does not fit its barcode type, negative balance, duplicate `id`), nothing is imported.
- Unknown fields are ignored, so files from a newer app with only additional fields still import.
- `version` greater than the app supports: rejected with "created by a newer version".
- Encrypted file: the app asks for the password and asks again after a wrong one.
- A photo whose `photos/<id>.jpg` entry is missing makes the file invalid. An imported photo whose id
  is already stored gets a new id (photo files are never overwritten); photo files no card refers to after the import are deleted.
- **Normal import:** each card replaces the stored card with the same `id` completely; all other
  stored cards stay unchanged. A tag from the file whose name matches a stored tag (ignoring case)
  is merged into it; a new tag whose `id` is already used by a differently named stored tag gets a
  new `id`.
- **Clean import** (switch on the export/import screen): all stored cards and tags are deleted and
  replaced by those from the file.
- Tags that no card uses any more are deleted.
- Both run in one database transaction: on error, the stored cards are unchanged.
