import type { Barcode, BarcodeScannerPlugin } from '@capacitor-mlkit/barcode-scanning';
import type { Mock } from 'vitest';

import { BARCODE_TYPES } from '../../domain/model/barcode-type';
import { ScannerNotReadyError } from '../../domain/ports/barcode-scanner';

import { MlKitBarcodeScanner } from './mlkit-barcode-scanner';

describe('MlKitBarcodeScanner', () => {
  let plugin: {
    scan: Mock<BarcodeScannerPlugin['scan']>;
    isGoogleBarcodeScannerModuleAvailable: Mock<BarcodeScannerPlugin['isGoogleBarcodeScannerModuleAvailable']>;
    installGoogleBarcodeScannerModule: Mock<BarcodeScannerPlugin['installGoogleBarcodeScannerModule']>;
  };
  let scanner: MlKitBarcodeScanner;

  const scanned = (barcode: Partial<Barcode>): void => {
    plugin.scan.mockResolvedValue({ barcodes: [barcode as Barcode] });
  };

  beforeEach(() => {
    plugin = {
      scan: vi.fn<BarcodeScannerPlugin['scan']>(),
      isGoogleBarcodeScannerModuleAvailable: vi
        .fn<BarcodeScannerPlugin['isGoogleBarcodeScannerModuleAvailable']>()
        .mockResolvedValue({ available: true }),
      installGoogleBarcodeScannerModule: vi
        .fn<BarcodeScannerPlugin['installGoogleBarcodeScannerModule']>()
        .mockResolvedValue(undefined),
    };
    scanner = new MlKitBarcodeScanner(plugin, true);
  });

  it('reports whether scanning is available', () => {
    expect(scanner.available).toBe(true);
    expect(new MlKitBarcodeScanner(plugin, false).available).toBe(false);
  });

  it.each(BARCODE_TYPES)('maps the ML Kit format %s to the same barcode type', async (type) => {
    scanned({ format: type as Barcode['format'], rawValue: 'value' });

    expect(await scanner.scan()).toEqual({ type, value: 'value' });
  });

  it('scans for all supported formats', async () => {
    scanned({ format: 'QR_CODE' as Barcode['format'], rawValue: 'x' });

    await scanner.scan();

    expect(plugin.scan).toHaveBeenCalledWith({ formats: [...BARCODE_TYPES] });
  });

  it('reads non-UTF-8 content from the signed raw bytes as ISO-8859-1', async () => {
    scanned({ format: 'CODE_128' as Barcode['format'], rawValue: '', bytes: [0x4d, -4, 0x6c] });

    expect(await scanner.scan()).toEqual({ type: 'CODE_128', value: 'Mül' });
  });

  it('resolves to undefined when the user cancels or nothing was found', async () => {
    plugin.scan.mockRejectedValueOnce(new Error('scan canceled.'));
    expect(await scanner.scan()).toBeUndefined();

    plugin.scan.mockResolvedValueOnce({ barcodes: [] });
    expect(await scanner.scan()).toBeUndefined();
  });

  it('passes other scanner errors on', async () => {
    plugin.scan.mockRejectedValue(new Error('boom'));

    await expect(scanner.scan()).rejects.toThrow('boom');
  });

  it('rejects formats outside ADR-0017', async () => {
    scanned({ format: 'MAXICODE' as Barcode['format'], rawValue: 'x' });

    await expect(scanner.scan()).rejects.toThrow('Unsupported barcode format: MAXICODE');
  });

  it('starts installing the Google scanner module and reports it as not ready', async () => {
    plugin.isGoogleBarcodeScannerModuleAvailable.mockResolvedValue({ available: false });
    plugin.installGoogleBarcodeScannerModule.mockRejectedValue(new Error('already installing'));

    await expect(scanner.scan()).rejects.toBeInstanceOf(ScannerNotReadyError);
    expect(plugin.installGoogleBarcodeScannerModule).toHaveBeenCalled();
    expect(plugin.scan).not.toHaveBeenCalled();
  });
});
