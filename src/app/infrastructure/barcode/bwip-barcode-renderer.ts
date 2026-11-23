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
      bcid: type === 'CODE_39' && !CODE_39_STANDARD.test(value) ? 'code39ext' : BCID[type],
      ...encode(type, value),
      scale: 3,
      // Quiet zone: about 12 modules for linear codes, 6 for 2D codes (points at scale 1).
      paddingwidth: 12,
      paddingheight: 12,
      backgroundcolor: 'FFFFFF',
    });
  }
}

/**
 * Characters of standard Code 39. Other printable ASCII (e.g. lowercase letters) needs *Code 39
 * extended*, which encodes them as two-symbol pairs; standard values are drawn as standard Code 39
 * because extended encoding would turn `$`, `/`, `+` and `%` into such pairs.
 */
const CODE_39_STANDARD = /^[0-9A-Z \-.$/+%]+$/;

const ECI_TYPES: ReadonlySet<BarcodeType> = new Set(['AZTEC', 'DATA_MATRIX', 'PDF_417', 'QR_CODE']);

/** Text and parse flag for bwip-js. */
function encode(type: BarcodeType, value: string): { text: string; parsefnc?: boolean } {
  if (type === 'CODABAR') {
    const upper = value.toUpperCase();
    return { text: /^[A-D]/.test(upper) ? upper : `A${upper}A` };
  }
  if (ECI_TYPES.has(type) && /[\u0080-\uFFFF]/.test(value)) {
    // bwip-js encodes text as UTF-8; ECI 26 tells readers so instead of letting them assume ISO-8859-1.
    // With `parsefnc` a `^` starts a function character, so a literal `^` is written as `^^`.
    return { text: `^ECI000026${value.replaceAll('^', '^^')}`, parsefnc: true };
  }
  return { text: value };
}
