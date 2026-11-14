import type { BarcodeType } from '../model/barcode-type';
import { BARCODE_TYPES } from '../model/barcode-type';

import { barcodeValueOf, isValidBarcodeValue } from './barcode-value';

const VALID: Record<BarcodeType, string[]> = {
  AZTEC: ['Müller €', 'x'],
  CODABAR: ['A123456B', 'c40156d', '1234-5678'],
  CODE_39: ['ABC-123', 'A B.$/+%'],
  CODE_93: ['ABC', 'abc 123!'],
  CODE_128: ['Hello 123', '~{}'],
  DATA_MATRIX: ['Müller €'],
  EAN_8: ['9638507', '96385074'],
  EAN_13: ['590123412345', '5901234123457', '4006381333931'],
  ITF: ['12', '12345678'],
  PDF_417: ['Müller €'],
  QR_CODE: ['https://example.com/?a=1'],
  UPC_A: ['03600029145', '036000291452'],
  UPC_E: ['0123456', '01234565', '1234567', '04252614', '02345673', '01200003', '01230004', '01234531', '01234543'],
};

const INVALID: Record<BarcodeType, string[]> = {
  AZTEC: [''],
  CODABAR: ['A12', '12E34', 'A12 3B'],
  CODE_39: ['abc', 'A_B'],
  CODE_93: ['Müller', 'tab\t'],
  CODE_128: ['Müller', 'line\n'],
  DATA_MATRIX: [''],
  EAN_8: ['963850', '96385075', '963850A'],
  EAN_13: ['59012341234', '5901234123458', '59012341234570'],
  ITF: ['1234567', '12a4'],
  PDF_417: [''],
  QR_CODE: [''],
  UPC_A: ['0360002914', '036000291453'],
  UPC_E: ['123456', '2123456', '01234567', '012345678'],
};

describe('isValidBarcodeValue', () => {
  describe.each(BARCODE_TYPES)('%s', (type) => {
    it.each(VALID[type])('accepts %j', (value) => expect(isValidBarcodeValue(type, value)).toBe(true));
    it.each(INVALID[type])('rejects %j', (value) => expect(isValidBarcodeValue(type, value)).toBe(false));
  });
});

describe('barcodeValueOf', () => {
  it('prefers the barcode value and falls back to the card ID', () => {
    expect(barcodeValueOf({ cardId: '1', barcodeValue: '2' })).toBe('2');
    expect(barcodeValueOf({ cardId: '1' })).toBe('1');
  });
});
