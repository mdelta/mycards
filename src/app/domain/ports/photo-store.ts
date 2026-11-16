/** Photo files in the app sandbox (ADR-0003), one JPEG per photo id. */
export interface PhotoStore {
  write(id: string, data: Uint8Array): Promise<void>;
  /** Resolves `undefined` if there is no file for `id`. */
  read(id: string): Promise<Uint8Array | undefined>;
  /** No-op for unknown ids. */
  delete(id: string): Promise<void>;
  /** Ids of all stored photos. */
  list(): Promise<string[]>;
}
