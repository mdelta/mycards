import type { BarcodeType } from './barcode-type';

/** Card data model (arc42 5.1, ADR-0016). Dates are ISO-8601 strings. */
export interface Card {
  id: string;
  storeName: string;
  /** Number shown to humans. */
  cardId: string;
  /** Encoded barcode value, only set if it differs from `cardId`. */
  barcodeValue?: string;
  barcodeType?: BarcodeType;
  note?: string;
  validFrom?: string;
  expiry?: string;
  balance?: number;
  /** Currency code or unit of `balance` (e.g. "EUR", "points"). */
  balanceType?: string;
  color?: string;
  icon?: string;
  favorite: boolean;
  archived: boolean;
  showOnLockScreen: boolean;
  homepageUrl?: string;
  /** Search term for the shop search (ADR-0005); defaults to `storeName`. */
  shopSearchTerm?: string;
  tagIds: string[];
  /** Further websites besides `homepageUrl` (F-06), in display order. */
  websites: WebsiteLink[];
  /** Photos (F-09) and the custom icon image, in display order. */
  photos: Photo[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface WebsiteLink {
  label?: string;
  url: string;
}

export const PHOTO_ROLES = ['front', 'back', 'icon', 'other'] as const;
/** `front`, `back` and `icon` occur at most once per card; `other` any number of times. */
export type PhotoRole = (typeof PHOTO_ROLES)[number];

/** A card photo; the image is a JPEG file in the app sandbox named after `id` (ADR-0003). */
export interface Photo {
  id: string;
  role: PhotoRole;
}
