import type * as BwipJs from 'bwip-js/browser';

import type { BarcodeType } from '../../domain/model/barcode-type';
import type { BarcodeRenderer } from '../../domain/ports/barcode-renderer';
import { isStandardCode39 } from '../../domain/services/barcode-value';

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

type Bwip = Pick<typeof BwipJs, 'toSVG' | 'toCanvas'>;

/** Pixels per barcode module in PNG images; the lock screen scales them up without smoothing. */
const PNG_SCALE = 4;

/**
 * Offline barcode drawing with bwip-js (ADR-0017). bwip-js is about 1 MB, so it is loaded on the
 * first render instead of with the app start (quality goal 1).
 */
export class BwipBarcodeRenderer implements BarcodeRenderer {
  private bwip?: Promise<Bwip>;

  constructor(
    private readonly createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas'),
    private readonly load: () => Promise<Bwip> = () => import('bwip-js/browser'),
  ) {}

  async toSvg(type: BarcodeType, value: string): Promise<string> {
    const { toSVG } = await this.library();
    return toSVG({ ...options(type, value), scale: 3 });
  }

  async toPng(type: BarcodeType, value: string): Promise<Uint8Array> {
    const { toCanvas } = await this.library();
    const canvas = this.createCanvas();
    toCanvas(canvas, { ...options(type, value), scale: PNG_SCALE });
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      throw new Error('PNG encoding failed');
    }
    return new Uint8Array(await blob.arrayBuffer());
  }

  private library(): Promise<Bwip> {
    this.bwip ??= this.load();
    return this.bwip;
  }
}

function options(type: BarcodeType, value: string): BwipJs.RenderOptions {
  return {
    bcid: type === 'CODE_39' && !isStandardCode39(value) ? 'code39ext' : BCID[type],
    ...encode(type, value),
    // Quiet zone: about 12 modules for linear codes, 6 for 2D codes (points at scale 1).
    paddingwidth: 12,
    paddingheight: 12,
    backgroundcolor: 'FFFFFF',
  };
}

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
