import type * as BwipJs from 'bwip-js/browser';

import type { BarcodeType } from '../../domain/model/barcode-type';
import type { BarcodeRenderer } from '../../domain/ports/barcode-renderer';

/** bwip-js symbology names for the ADR-0017 types. */
const BCID: Record<BarcodeType, string> = {
  AZTEC: 'azteccode',
  CODABAR: 'rationalizedCodabar',
  CODE_39: 'code39',
  CODE_93: 'code93ext',
  CODE_128: 'code128',
  DATA_MATRIX: 'datamatrix',
  EAN_8: 'ean8',
  EAN_13: 'ean13',
  ITF: 'interleaved2of5',
  PDF_417: 'pdf417',
  QR_CODE: 'qrcode',
  UPC_A: 'upca',
  UPC_E: 'upce',
};

/**
 * Offline barcode drawing with bwip-js (ADR-0017). bwip-js is about 1 MB, so it is loaded on the
 * first render instead of with the app start (quality goal 1).
 */
export class BwipBarcodeRenderer implements BarcodeRenderer {
  private bwip?: Promise<typeof BwipJs>;

  async toSvg(type: BarcodeType, value: string): Promise<string> {
    this.bwip ??= import('bwip-js/browser');
    const { toSVG } = await this.bwip;
    return toSVG({
      bcid: BCID[type],
      text: type === 'CODABAR' && !/^[A-D]/i.test(value) ? `A${value}A` : value,
      scale: 3,
      // Quiet zone: about 12 modules for linear codes, 6 for 2D codes (points at scale 1).
      paddingwidth: 12,
      paddingheight: 12,
      backgroundcolor: 'FFFFFF',
    });
  }
}
