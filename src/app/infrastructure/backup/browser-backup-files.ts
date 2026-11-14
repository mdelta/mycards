import type { BackupFiles, BinaryFile } from '../../domain/ports/backup-files';

/** `BackupFiles` for the browser build (development and e2e tests): download and file input. */
export class BrowserBackupFiles implements BackupFiles {
  constructor(private readonly document: Document) {}

  async share(file: BinaryFile): Promise<void> {
    const url = URL.createObjectURL(new Blob([file.data as Uint8Array<ArrayBuffer>], { type: 'application/zip' }));
    const link = this.document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  }

  pick(): Promise<BinaryFile | undefined> {
    const input = this.document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,application/zip';
    return new Promise((resolve, reject) => {
      input.addEventListener('cancel', () => resolve(undefined));
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(undefined);
          return;
        }
        file
          .arrayBuffer()
          .then((buffer) => resolve({ name: file.name, data: new Uint8Array(buffer) }))
          .catch(reject);
      });
      input.click();
    });
  }
}
