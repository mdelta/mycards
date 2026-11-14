import { Directory } from '@capacitor/filesystem';

import { CapacitorBackupFiles } from './capacitor-backup-files';

describe('CapacitorBackupFiles', () => {
  const filesystem = {
    rmdir: vi.fn(async () => undefined),
    writeFile: vi.fn(async () => ({ uri: 'file:///cache/exports/backup.zip' })),
  };
  const sharing = { share: vi.fn(async () => ({})) };
  const picker = {
    pickFiles: vi.fn(async () => ({
      files: [{ name: 'backup.zip', mimeType: 'application/zip', size: 3, data: 'AQID' }],
    })),
  };
  const files = new CapacitorBackupFiles(filesystem, sharing, picker);
  const file = { name: 'backup.zip', data: new Uint8Array([1, 2, 3]) };

  beforeEach(() => vi.clearAllMocks());

  it('writes the file to a fresh cache folder and opens the share sheet', async () => {
    await files.share(file);

    expect(filesystem.rmdir).toHaveBeenCalledWith({ path: 'exports', directory: Directory.Cache, recursive: true });
    expect(filesystem.writeFile).toHaveBeenCalledWith({
      path: 'exports/backup.zip',
      data: 'AQID',
      directory: Directory.Cache,
      recursive: true,
    });
    expect(sharing.share).toHaveBeenCalledWith({ files: ['file:///cache/exports/backup.zip'] });
  });

  it('exports even if there is no old export folder', async () => {
    filesystem.rmdir.mockRejectedValueOnce(new Error('Folder does not exist.'));

    await files.share(file);

    expect(sharing.share).toHaveBeenCalled();
  });

  it('treats closing the share sheet as success', async () => {
    sharing.share.mockRejectedValueOnce(new Error('Share canceled'));

    await expect(files.share(file)).resolves.toBeUndefined();
  });

  it('reports other share errors', async () => {
    sharing.share.mockRejectedValueOnce(new Error('No app'));

    await expect(files.share(file)).rejects.toThrow('No app');
  });

  it('picks one file and reads its content', async () => {
    const picked = await files.pick();

    expect(picker.pickFiles).toHaveBeenCalledWith({ limit: 1, readData: true });
    expect({ name: picked?.name, data: [...(picked?.data ?? [])] }).toEqual({ name: 'backup.zip', data: [1, 2, 3] });
  });

  it('returns undefined when the user cancels or no data is returned', async () => {
    picker.pickFiles.mockRejectedValueOnce(new Error('pickFiles canceled.'));
    expect(await files.pick()).toBeUndefined();

    picker.pickFiles.mockResolvedValueOnce({ files: [] });
    expect(await files.pick()).toBeUndefined();
  });

  it('reports other picker errors', async () => {
    picker.pickFiles.mockRejectedValueOnce(new Error('broken'));

    await expect(files.pick()).rejects.toThrow('broken');
  });
});
