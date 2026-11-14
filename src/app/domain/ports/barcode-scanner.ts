import type { BarcodeType } from '../model/barcode-type';

export interface ScannedBarcode {
  type: BarcodeType;
  value: string;
}

/** Camera barcode scanning (F-02, ADR-0010). */
export interface BarcodeScanner {
  /** False where no scanner exists (e.g. in the browser); the UI then hides scanning. */
  readonly available: boolean;
  /** Resolves to `undefined` if the user cancels; rejects with `ScannerNotReadyError` while the scanner is being installed. */
  scan(): Promise<ScannedBarcode | undefined>;
}

export class ScannerNotReadyError extends Error {
  constructor() {
    super('The barcode scanner is not installed yet.');
    this.name = 'ScannerNotReadyError';
  }
}
