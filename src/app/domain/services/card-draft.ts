import type { Card } from '../model/card';

import { barcodeValueOf, isValidBarcodeValue } from './barcode-value';

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
  >
>;

export type CardValidationError =
  'storeNameRequired' | 'cardIdRequired' | 'barcodeValueInvalid' | 'balanceInvalid' | 'expiryBeforeValidFrom';

const OPTIONAL_TEXT_FIELDS = ['barcodeValue', 'note', 'validFrom', 'expiry', 'balanceType'] as const;

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
  return errors;
}
