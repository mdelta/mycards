import type { BarcodeFormat, BarcodeScannerPlugin } from '@capacitor-mlkit/barcode-scanning';

import { BARCODE_TYPES, isBarcodeType } from '../../domain/model/barcode-type';
import type { BarcodeScanner, ScannedBarcode } from '../../domain/ports/barcode-scanner';
import { ScannerNotReadyError } from '../../domain/ports/barcode-scanner';

type ScannerPlugin = Pick<
  BarcodeScannerPlugin,
  'scan' | 'isGoogleBarcodeScannerModuleAvailable' | 'installGoogleBarcodeScannerModule'
>;

/** Rejection message of the plugin when the user closes the scanner. */
const SCAN_CANCELED = 'scan canceled.';

/** Domain barcode types and ML Kit formats share their names (ADR-0017). */
const FORMATS = BARCODE_TYPES as readonly string[] as BarcodeFormat[];

/**
 * `BarcodeScanner` with Google's ready-made ML Kit scanner (`scan()`): it runs in Google Play
 * services, so the app needs no camera permission (ADR-0010).
 */
export class MlKitBarcodeScanner implements BarcodeScanner {
  constructor(
    private readonly plugin: ScannerPlugin,
    readonly available: boolean,
  ) {}

  async scan(): Promise<ScannedBarcode | undefined> {
    const { available } = await this.plugin.isGoogleBarcodeScannerModuleAvailable();
    if (!available) {
      // Installation continues in the background; a failed start (e.g. already installing) changes nothing for the user.
      await this.plugin.installGoogleBarcodeScannerModule().catch(() => undefined);
      throw new ScannerNotReadyError();
    }
    let barcodes;
    try {
      ({ barcodes } = await this.plugin.scan({ formats: FORMATS }));
    } catch (error) {
      if (error instanceof Error && error.message === SCAN_CANCELED) {
        return undefined;
      }
      throw error;
    }
    const [barcode] = barcodes;
    if (!barcode) {
      return undefined;
    }
    if (!isBarcodeType(barcode.format)) {
      throw new Error(`Unsupported barcode format: ${barcode.format}`);
    }
    return { type: barcode.format, value: barcode.rawValue || latin1(barcode.bytes ?? []) };
  }
}

/** Fallback when `rawValue` is empty (non-UTF-8 content); Android delivers Java's signed bytes. */
function latin1(bytes: number[]): string {
  return String.fromCharCode(...bytes.map((byte) => byte & 0xff));
}
