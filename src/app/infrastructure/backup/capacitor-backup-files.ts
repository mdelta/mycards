import type { FilesystemPlugin } from '@capacitor/filesystem';
import { Directory } from '@capacitor/filesystem';
import type { SharePlugin } from '@capacitor/share';
import type { FilePickerPlugin } from '@capawesome/capacitor-file-picker';

import type { BackupFiles, BinaryFile } from '../../domain/ports/backup-files';

import { fromBase64, toBase64 } from './base64';

/** Cache sub-folder for export files; emptied before each export so no old backup stays behind. */
const EXPORT_DIR = 'exports';
const SHARE_CANCELED = 'Share canceled';
const PICK_CANCELED = 'pickFiles canceled.';

/** `BackupFiles` on Android: share sheet for export, system file picker for import (ADR-0004). */
export class CapacitorBackupFiles implements BackupFiles {
  constructor(
    private readonly filesystem: Pick<FilesystemPlugin, 'writeFile' | 'rmdir'>,
    private readonly sharing: Pick<SharePlugin, 'share'>,
    private readonly picker: Pick<FilePickerPlugin, 'pickFiles'>,
  ) {}

  async share(file: BinaryFile): Promise<void> {
    await this.filesystem
      .rmdir({ path: EXPORT_DIR, directory: Directory.Cache, recursive: true })
      .catch(() => undefined);
    const { uri } = await this.filesystem.writeFile({
      path: `${EXPORT_DIR}/${file.name}`,
      data: toBase64(file.data),
      directory: Directory.Cache,
      recursive: true,
    });
    try {
      await this.sharing.share({ files: [uri] });
    } catch (error) {
      if (!isError(error, SHARE_CANCELED)) {
        throw error;
      }
    }
  }

  async pick(): Promise<BinaryFile | undefined> {
    try {
      const { files } = await this.picker.pickFiles({ limit: 1, readData: true });
      const [file] = files;
      if (!file?.data) {
        return undefined;
      }
      return { name: file.name, data: fromBase64(file.data) };
    } catch (error) {
      if (isError(error, PICK_CANCELED)) {
        return undefined;
      }
      throw error;
    }
  }
}

function isError(error: unknown, message: string): boolean {
  return error instanceof Error && error.message === message;
}
