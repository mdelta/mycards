import { CanvasImageProcessor } from './canvas-image-processor';

describe('CanvasImageProcessor', () => {
  const context = { drawImage: vi.fn() };
  let blob: Blob | null;
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn((): unknown => context),
    toBlob: vi.fn((callback: (blob: Blob | null) => void) => callback(blob)),
  };
  const document = { createElement: vi.fn(() => canvas) };
  const bitmap = { width: 4000, height: 3000 } as ImageBitmap;
  const decode = vi.fn(async () => bitmap);
  const processor = new CanvasImageProcessor(document as unknown as Document, decode);

  beforeEach(() => {
    vi.clearAllMocks();
    blob = new Blob([new Uint8Array([9])]);
  });

  it('scales a photo down and encodes it as JPEG', async () => {
    expect(await processor.resize(new Uint8Array([1]), 1600, 0.8)).toEqual(new Uint8Array([9]));

    expect(decode).toHaveBeenCalledWith(expect.any(Blob));
    expect([canvas.width, canvas.height]).toEqual([1600, 1200]);
    expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1600, 1200);
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.8);
  });

  it('crops the centered square for an icon', async () => {
    await processor.cropSquare(new Uint8Array([1]), 256, 0.8);

    expect([canvas.width, canvas.height]).toEqual([256, 256]);
    expect(context.drawImage).toHaveBeenCalledWith(bitmap, 500, 0, 3000, 3000, 0, 0, 256, 256);
  });

  it('fails without a 2D context or when encoding fails', async () => {
    canvas.getContext.mockReturnValueOnce(null);
    await expect(processor.resize(new Uint8Array([1]), 1600, 0.8)).rejects.toThrow('Canvas');

    blob = null;
    await expect(processor.resize(new Uint8Array([1]), 1600, 0.8)).rejects.toThrow('JPEG');
  });
});
