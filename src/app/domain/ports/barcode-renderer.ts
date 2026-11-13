import type { BarcodeType } from '../model/barcode-type';

/** Draws barcodes for presentation (ADR-0017). */
export interface BarcodeRenderer {
  /** Resolves to SVG markup; rejects if `value` cannot be encoded as `type`. */
  toSvg(type: BarcodeType, value: string): Promise<string>;
}
