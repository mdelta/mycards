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
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Website {
  id: string;
  cardId: string;
  label?: string;
  url: string;
}

export type PhotoRole = 'front' | 'back' | 'icon' | 'other';

export interface Photo {
  id: string;
  cardId: string;
  role: PhotoRole;
  /** Reference to the file in the app sandbox (ADR-0003). */
  fileRef: string;
}
