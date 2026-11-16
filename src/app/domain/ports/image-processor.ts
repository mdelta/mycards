/** Decodes an image and re-encodes it as JPEG (quality 0–1). */
export interface ImageProcessor {
  /** Scales down so the longer edge is at most `maxEdge`. */
  resize(image: Uint8Array, maxEdge: number, quality: number): Promise<Uint8Array>;
  /** Crops the centered square and scales it to `size` × `size`. */
  cropSquare(image: Uint8Array, size: number, quality: number): Promise<Uint8Array>;
}
