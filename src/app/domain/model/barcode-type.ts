/** Barcode types supported for scanning and rendering (ADR-0017). */
export const BARCODE_TYPES = [
  'AZTEC',
  'CODABAR',
  'CODE_39',
  'CODE_93',
  'CODE_128',
  'DATA_MATRIX',
  'EAN_8',
  'EAN_13',
  'ITF',
  'PDF_417',
  'QR_CODE',
  'UPC_A',
  'UPC_E',
] as const;

export type BarcodeType = (typeof BARCODE_TYPES)[number];

export function isBarcodeType(value: string): value is BarcodeType {
  return (BARCODE_TYPES as readonly string[]).includes(value);
}
