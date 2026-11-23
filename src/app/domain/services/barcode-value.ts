import type { BarcodeType } from '../model/barcode-type';
import type { Card } from '../model/card';

const DIGITS = /^\d+$/;
const PRINTABLE_ASCII = /^[\x20-\x7E]+$/;
/** Characters of standard Code 39; extended Code 39 is only needed for other printable ASCII. */
const CODE_39_STANDARD = /^[0-9A-Z \-.$/+%]+$/;
/** Characters extended Code 39 keeps as one symbol; it encodes all others as two-symbol pairs. */
const CODE_39_SINGLE = /[0-9A-Z \-.]/;
/** Most Code 39 symbols bwip-js draws. */
const CODE_39_MAX_SYMBOLS = 500;
const CODABAR = /^([A-D][0-9\-$:/.+]*[A-D]|[0-9\-$:/.+]+)$/i;

const RULES: Record<BarcodeType, (value: string) => boolean> = {
  AZTEC: () => true,
  CODABAR: (v) => CODABAR.test(v),
  CODE_39: (v) => PRINTABLE_ASCII.test(v) && code39Symbols(v) <= CODE_39_MAX_SYMBOLS,
  CODE_93: (v) => PRINTABLE_ASCII.test(v),
  CODE_128: (v) => PRINTABLE_ASCII.test(v),
  DATA_MATRIX: () => true,
  EAN_8: (v) => isGtin(v, 7),
  EAN_13: (v) => isGtin(v, 12),
  ITF: (v) => DIGITS.test(v) && v.length % 2 === 0,
  PDF_417: () => true,
  QR_CODE: () => true,
  UPC_A: (v) => isGtin(v, 11),
  UPC_E: isUpcE,
};

/** The value encoded in the barcode: the barcode value if set, otherwise the card ID (ADR-0016). */
export function barcodeValueOf(card: Pick<Card, 'cardId' | 'barcodeValue'>): string {
  return card.barcodeValue ?? card.cardId;
}

/**
 * Whether `value` can be encoded as `type` (ADR-0017): allowed characters, length and check digit.
 * Values with an optional check digit may omit it; the renderer then adds it.
 */
export function isValidBarcodeValue(type: BarcodeType, value: string): boolean {
  return value.length > 0 && RULES[type](value);
}

/**
 * Whether a Code 39 value is drawn as standard Code 39. Other values (e.g. lowercase letters) need
 * *Code 39 extended*; standard values stay standard because extended encoding would turn `$`, `/`,
 * `+` and `%` into two-symbol pairs.
 */
export function isStandardCode39(value: string): boolean {
  return CODE_39_STANDARD.test(value);
}

function code39Symbols(value: string): number {
  if (isStandardCode39(value)) {
    return value.length;
  }
  return [...value].reduce((count, char) => count + (CODE_39_SINGLE.test(char) ? 1 : 2), 0);
}

/** EAN/UPC: `payloadLength` digits, optionally followed by the correct check digit. */
function isGtin(value: string, payloadLength: number): boolean {
  if (!DIGITS.test(value)) {
    return false;
  }
  if (value.length === payloadLength) {
    return true;
  }
  return value.length === payloadLength + 1 && checkDigit(value.slice(0, -1)) === Number(value.at(-1));
}

/** UPC-E: number system 0/1, six digits, optional check digit (computed on the expanded UPC-A). */
function isUpcE(value: string): boolean {
  if (!/^[01]\d{6,7}$/.test(value)) {
    return false;
  }
  return value.length === 7 || checkDigit(expandUpcE(value.slice(0, 7))) === Number(value[7]);
}

function expandUpcE(value: string): string {
  const [ns, d1, d2, d3, d4, d5, d6] = value;
  switch (d6) {
    case '0':
    case '1':
    case '2':
      return `${ns}${d1}${d2}${d6}0000${d3}${d4}${d5}`;
    case '3':
      return `${ns}${d1}${d2}${d3}00000${d4}${d5}`;
    case '4':
      return `${ns}${d1}${d2}${d3}${d4}00000${d5}`;
    default:
      return `${ns}${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  }
}

/** GS1 mod-10 check digit: weights 3, 1, 3, … from the right. */
function checkDigit(payload: string): number {
  const sum = [...payload].reverse().reduce((acc, digit, i) => acc + Number(digit) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
}
