import type * as ZipJsModule from '@zip.js/zip.js';

import { BackupError } from '../../domain/model/backup-error';
import type { ArchiveCodec } from '../../domain/ports/archive-codec';
import type { BinaryFile } from '../../domain/ports/backup-files';

type ZipJs = typeof ZipJsModule;

/** zip.js encryption strength 3 is AES-256 (ADR-0004). */
const AES_256 = 3;

/** `ArchiveCodec` on @zip.js/zip.js, loaded on first use to keep it out of the start-up bundle. */
export class ZipJsArchiveCodec implements ArchiveCodec {
  private zipJs?: Promise<ZipJs>;

  async pack(entries: BinaryFile[], password?: string): Promise<Uint8Array> {
    const { ZipWriter, Uint8ArrayWriter, Uint8ArrayReader } = await this.load();
    const writer = new ZipWriter(new Uint8ArrayWriter(), password ? { password, encryptionStrength: AES_256 } : {});
    for (const entry of entries) {
      await writer.add(entry.name, new Uint8ArrayReader(entry.data));
    }
    return writer.close();
  }

  async unpack(data: Uint8Array, password?: string): Promise<BinaryFile[]> {
    const zipJs = await this.load();
    const reader = new zipJs.ZipReader(new zipJs.Uint8ArrayReader(data), password ? { password } : {});
    try {
      const files: BinaryFile[] = [];
      for (const entry of await reader.getEntries()) {
        if (!entry.directory) {
          files.push({ name: entry.filename, data: await entry.getData(new zipJs.Uint8ArrayWriter()) });
        }
      }
      return files;
    } catch (error) {
      throw toBackupError(zipJs, error);
    } finally {
      await reader.close();
    }
  }

  private load(): Promise<ZipJs> {
    this.zipJs ??= import('@zip.js/zip.js').then((zipJs) => {
      zipJs.configure({ useWebWorkers: false });
      return zipJs;
    });
    return this.zipJs;
  }
}

function toBackupError(zipJs: ZipJs, error: unknown): BackupError {
  const message = error instanceof Error ? error.message : '';
  if (message === zipJs.ERR_ENCRYPTED) {
    return new BackupError('passwordRequired');
  }
  if (message === zipJs.ERR_INVALID_PASSWORD) {
    return new BackupError('wrongPassword');
  }
  return new BackupError('unreadable');
}
