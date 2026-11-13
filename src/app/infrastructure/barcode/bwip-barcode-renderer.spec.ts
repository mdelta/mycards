import type { BarcodeType } from '../../domain/model/barcode-type';
import { BARCODE_TYPES } from '../../domain/model/barcode-type';
import { isValidBarcodeValue } from '../../domain/services/barcode-value';

import { BwipBarcodeRenderer } from './bwip-barcode-renderer';

/** Values the domain accepts must render; one sample per type plus the edge cases of the rules. */
const SAMPLES: Record<BarcodeType, string[]> = {
  AZTEC: ['Müller €'],
  CODABAR: ['A123456B', '1234-5678'],
  CODE_39: ['ABC-123'],
  CODE_93: ['abc 123!'],
  CODE_128: ['Hello 123'],
  DATA_MATRIX: ['Müller €'],
  EAN_8: ['9638507', '96385074'],
  EAN_13: ['590123412345', '5901234123457'],
  ITF: ['12345678'],
  PDF_417: ['Müller €'],
  QR_CODE: ['https://example.com/?a=1'],
  UPC_A: ['03600029145', '036000291452'],
  UPC_E: ['0123456', '01234565', '04252614', '02345673', '01200003', '01230004', '1234567', '01234531', '01234543'],
};

describe('BwipBarcodeRenderer', () => {
  const renderer = new BwipBarcodeRenderer();

  describe.each(BARCODE_TYPES)('%s', (type) => {
    it.each(SAMPLES[type])('renders a domain-valid value %j as SVG', async (value) => {
      expect(isValidBarcodeValue(type, value)).toBe(true);

      const svg = await renderer.toSvg(type, value);

      expect(svg).toMatch(/^<svg [^>]*viewBox="0 0 \d+ \d+"/);
      expect(svg).toContain('<path');
      expect(svg).toContain('fill="#FFFFFF"');
    });
  });

  it('encodes different values differently', async () => {
    expect(await renderer.toSvg('QR_CODE', 'a')).not.toBe(await renderer.toSvg('QR_CODE', 'b'));
  });

  it('rejects values the symbology cannot encode', async () => {
    await expect(renderer.toSvg('EAN_13', '5901234123458')).rejects.toThrow(/check digit/i);
  });
});
