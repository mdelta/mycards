import type { Size } from '../../domain/model/photo';
import { centerSquare, fitWithin } from '../../domain/model/photo';
import type { ImageProcessor } from '../../domain/ports/image-processor';

type Decode = (image: Blob) => Promise<ImageBitmap>;

/** `ImageProcessor` with the WebView's image decoder and a canvas (works the same in the browser). */
export class CanvasImageProcessor implements ImageProcessor {
  constructor(
    private readonly document: Pick<Document, 'createElement'>,
    private readonly decode: Decode = (image) => createImageBitmap(image),
  ) {}

  async resize(image: Uint8Array, maxEdge: number, quality: number): Promise<Uint8Array> {
    const bitmap = await this.load(image);
    const size = fitWithin(bitmap, maxEdge);
    return this.encode(size, (context) => context.drawImage(bitmap, 0, 0, size.width, size.height), quality);
  }

  async cropSquare(image: Uint8Array, size: number, quality: number): Promise<Uint8Array> {
    const bitmap = await this.load(image);
    const square = centerSquare(bitmap);
    return this.encode(
      { width: size, height: size },
      (context) => context.drawImage(bitmap, square.x, square.y, square.size, square.size, 0, 0, size, size),
      quality,
    );
  }

  async toPng(image: Uint8Array): Promise<Uint8Array> {
    const bitmap = await this.load(image);
    return this.encode(bitmap, (context) => context.drawImage(bitmap, 0, 0));
  }

  private load(image: Uint8Array): Promise<ImageBitmap> {
    return this.decode(new Blob([image as Uint8Array<ArrayBuffer>]));
  }

  /** JPEG with `quality`, PNG without. */
  private async encode(
    size: Size,
    draw: (context: CanvasRenderingContext2D) => void,
    quality?: number,
  ): Promise<Uint8Array> {
    const canvas = this.document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context unavailable');
    }
    draw(context);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, quality === undefined ? 'image/png' : 'image/jpeg', quality),
    );
    if (!blob) {
      throw new Error('Image encoding failed');
    }
    return new Uint8Array(await blob.arrayBuffer());
  }
}
