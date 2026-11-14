import { normalizeCardDraft, validateCardDraft } from './card-draft';

describe('validateCardDraft', () => {
  it('accepts a draft with store name and card ID', () => {
    expect(validateCardDraft({ storeName: 'Store', cardId: '123' })).toEqual([]);
  });

  it('requires a non-blank store name and card ID', () => {
    expect(validateCardDraft({ storeName: ' ', cardId: '' })).toEqual(['storeNameRequired', 'cardIdRequired']);
  });

  it('checks the barcode value, or else the card ID, against the barcode type', () => {
    expect(validateCardDraft({ storeName: 'S', cardId: '5901234123457', barcodeType: 'EAN_13' })).toEqual([]);
    expect(validateCardDraft({ storeName: 'S', cardId: 'abc', barcodeType: 'EAN_13' })).toEqual([
      'barcodeValueInvalid',
    ]);
    expect(
      validateCardDraft({ storeName: 'S', cardId: 'abc', barcodeValue: '5901234123457', barcodeType: 'EAN_13' }),
    ).toEqual([]);
    expect(validateCardDraft({ storeName: 'S', cardId: 'abc' })).toEqual([]);
    expect(validateCardDraft({ storeName: 'S', cardId: ' ', barcodeType: 'EAN_13' })).toEqual(['cardIdRequired']);
  });

  it('rejects a negative or non-finite balance', () => {
    expect(validateCardDraft({ storeName: 'S', cardId: '1', balance: Number.NaN })).toEqual(['balanceInvalid']);
    expect(validateCardDraft({ storeName: 'S', cardId: '1', balance: -1 })).toEqual(['balanceInvalid']);
  });

  it('rejects an expiry date before the valid-from date', () => {
    expect(validateCardDraft({ storeName: 'S', cardId: '1', validFrom: '2026-02-01', expiry: '2026-01-31' })).toEqual([
      'expiryBeforeValidFrom',
    ]);
    expect(validateCardDraft({ storeName: 'S', cardId: '1', validFrom: '2026-02-01', expiry: '2026-02-01' })).toEqual(
      [],
    );
  });
});

describe('normalizeCardDraft', () => {
  it('trims text fields and turns blank optional fields into undefined', () => {
    expect(
      normalizeCardDraft({ storeName: ' Store ', cardId: ' 123 ', note: '  ', balanceType: ' EUR ', barcodeValue: '' }),
    ).toEqual({ storeName: 'Store', cardId: '123', note: undefined, balanceType: 'EUR', barcodeValue: undefined });
  });

  it('drops a barcode value that equals the card ID', () => {
    expect(normalizeCardDraft({ storeName: 'S', cardId: '123', barcodeValue: ' 123' }).barcodeValue).toBeUndefined();
    expect(normalizeCardDraft({ storeName: 'S', cardId: '123', barcodeValue: '0123' }).barcodeValue).toBe('0123');
  });

  it('keeps only the keys present in the draft', () => {
    expect(Object.keys(normalizeCardDraft({ favorite: true }))).toEqual(['favorite']);
  });
});
