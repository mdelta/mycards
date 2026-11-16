import type { FilesystemPlugin } from '@capacitor/filesystem';
import { Directory } from '@capacitor/filesystem';

import type { PhotoStore } from '../../domain/ports/photo-store';
import { fromBase64, toBase64 } from '../backup/base64';

const PHOTO_DIR = 'photos';
const EXTENSION = '.jpg';

/**
 * `PhotoStore` in the app's private files folder (ADR-0003), which Android Auto Backup includes. In the
 * browser, the Filesystem plugin keeps the files in IndexedDB.
 */
export class FilesystemPhotoStore implements PhotoStore {
  constructor(
    private readonly filesystem: Pick<FilesystemPlugin, 'writeFile' | 'readFile' | 'deleteFile' | 'readdir'>,
  ) {}

  async write(id: string, data: Uint8Array): Promise<void> {
    await this.filesystem.writeFile({ ...location(id), data: toBase64(data), recursive: true });
  }

  async read(id: string): Promise<Uint8Array | undefined> {
    try {
      const { data } = await this.filesystem.readFile(location(id));
      return typeof data === 'string' ? fromBase64(data) : new Uint8Array(await data.arrayBuffer());
    } catch {
      return undefined;
    }
  }

  async delete(id: string): Promise<void> {
    await this.filesystem.deleteFile(location(id)).catch(() => undefined);
  }

  async list(): Promise<string[]> {
    try {
      const { files } = await this.filesystem.readdir({ path: PHOTO_DIR, directory: Directory.Data });
      return files
        .map((file) => file.name)
        .filter((name) => name.endsWith(EXTENSION))
        .map((name) => name.slice(0, -EXTENSION.length));
    } catch {
      return [];
    }
  }
}

function location(id: string): { path: string; directory: Directory } {
  return { path: `${PHOTO_DIR}/${id}${EXTENSION}`, directory: Directory.Data };
}
