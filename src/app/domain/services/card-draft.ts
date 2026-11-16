import type { Card, WebsiteLink } from '../model/card';
import { isCardColor } from '../model/card-appearance';

import { barcodeValueOf, isValidBarcodeValue } from './barcode-value';
import { isWebUrl } from './links';

/** Fields the user edits directly; system fields (id, timestamps) are managed by `CardService`. */
export type CardDraft = Partial<
  Pick<
    Card,
    | 'storeName'
    | 'cardId'
    | 'barcodeValue'
    | 'barcodeType'
    | 'note'
    | 'validFrom'
    | 'expiry'
    | 'balance'
    | 'balanceType'
    | 'favorite'
    | 'showOnLockScreen'
    | 'color'
    | 'icon'
    | 'homepageUrl'
    | 'shopSearchTerm'
    | 'tagIds'
    | 'websites'
    | 'photos'
  >
>;

export type CardValidationError =
  | 'storeNameRequired'
  | 'cardIdRequired'
  | 'barcodeValueInvalid'
  | 'balanceInvalid'
  | 'expiryBeforeValidFrom'
  | 'colorInvalid'
  | 'homepageUrlInvalid'
  | 'websiteUrlInvalid';

const OPTIONAL_TEXT_FIELDS = [
  'barcodeValue',
  'note',
  'validFrom',
  'expiry',
  'balanceType',
  'color',
  'icon',
  'homepageUrl',
  'shopSearchTerm',
] as const;

/** Trims text, maps blank optional text to `undefined` and keeps only the keys present in `draft`. */
export function normalizeCardDraft(draft: CardDraft): CardDraft {
  const result: CardDraft = { ...draft };
  if (draft.storeName !== undefined) {
    result.storeName = draft.storeName.trim();
  }
  if (draft.cardId !== undefined) {
    result.cardId = draft.cardId.trim();
  }
  for (const field of OPTIONAL_TEXT_FIELDS) {
    if (field in draft) {
      result[field] = draft[field]?.trim() || undefined;
    }
  }
  if (draft.tagIds) {
    result.tagIds = [...new Set(draft.tagIds)];
  }
  if (draft.websites) {
    result.websites = draft.websites.map(normalizeWebsite).filter((site) => site.url || site.label);
  }
  if (result.barcodeValue !== undefined && result.barcodeValue === result.cardId) {
    result.barcodeValue = undefined;
  }
  return result;
}

export function validateCardDraft(draft: CardDraft): CardValidationError[] {
  const errors: CardValidationError[] = [];
  if (!draft.storeName?.trim()) {
    errors.push('storeNameRequired');
  }
  if (!draft.cardId?.trim()) {
    errors.push('cardIdRequired');
  } else if (
    draft.barcodeType &&
    !isValidBarcodeValue(draft.barcodeType, barcodeValueOf({ ...draft, cardId: draft.cardId }))
  ) {
    errors.push('barcodeValueInvalid');
  }
  if (draft.balance !== undefined && !(Number.isFinite(draft.balance) && draft.balance >= 0)) {
    errors.push('balanceInvalid');
  }
  if (draft.validFrom && draft.expiry && draft.expiry < draft.validFrom) {
    errors.push('expiryBeforeValidFrom');
  }
  if (draft.color && !isCardColor(draft.color)) {
    errors.push('colorInvalid');
  }
  if (draft.homepageUrl && !isWebUrl(draft.homepageUrl)) {
    errors.push('homepageUrlInvalid');
  }
  if (draft.websites?.some((site) => !isWebUrl(site.url))) {
    errors.push('websiteUrlInvalid');
  }
  return errors;
}

function normalizeWebsite(site: WebsiteLink): WebsiteLink {
  const label = site.label?.trim();
  return label ? { label, url: site.url.trim() } : { url: site.url.trim() };
}
