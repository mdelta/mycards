import type { PhotoStore } from '../app/domain/ports/photo-store';

/** `PhotoStore` fake for unit tests. */
export class InMemoryPhotoStore implements PhotoStore {
  readonly files = new Map<string, Uint8Array>();

  constructor(files: Record<string, Uint8Array> = {}) {
    Object.entries(files).forEach(([id, data]) => this.files.set(id, data));
  }

  async write(id: string, data: Uint8Array): Promise<void> {
    this.files.set(id, data);
  }

  async read(id: string): Promise<Uint8Array | undefined> {
    return this.files.get(id);
  }

  async delete(id: string): Promise<void> {
    this.files.delete(id);
  }

  async list(): Promise<string[]> {
    return [...this.files.keys()];
  }
}
