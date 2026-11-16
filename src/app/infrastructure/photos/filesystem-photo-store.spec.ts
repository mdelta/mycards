import { Directory } from '@capacitor/filesystem';

import { FilesystemPhotoStore } from './filesystem-photo-store';

describe('FilesystemPhotoStore', () => {
  const filesystem = {
    writeFile: vi.fn(async () => ({ uri: 'file://x' })),
    readFile: vi.fn(),
    deleteFile: vi.fn(async () => undefined),
    readdir: vi.fn(),
  };
  const store = new FilesystemPhotoStore(filesystem);

  beforeEach(() => vi.clearAllMocks());

  it('writes a photo as a JPEG file in the private data folder', async () => {
    await store.write('p1', new Uint8Array([1, 2, 3]));

    expect(filesystem.writeFile).toHaveBeenCalledWith({
      path: 'photos/p1.jpg',
      directory: Directory.Data,
      data: 'AQID',
      recursive: true,
    });
  });

  it('reads base64 and Blob data', async () => {
    filesystem.readFile.mockResolvedValueOnce({ data: 'AQID' });
    expect(await store.read('p1')).toEqual(new Uint8Array([1, 2, 3]));

    filesystem.readFile.mockResolvedValueOnce({ data: new Blob([new Uint8Array([4])]) });
    expect(await store.read('p1')).toEqual(new Uint8Array([4]));
    expect(filesystem.readFile).toHaveBeenCalledWith({ path: 'photos/p1.jpg', directory: Directory.Data });
  });

  it('resolves undefined for a missing file', async () => {
    filesystem.readFile.mockRejectedValueOnce(new Error('File does not exist'));

    expect(await store.read('p1')).toBeUndefined();
  });

  it('ignores deleting a missing file', async () => {
    filesystem.deleteFile.mockRejectedValueOnce(new Error('File does not exist'));

    await expect(store.delete('p1')).resolves.toBeUndefined();
    expect(filesystem.deleteFile).toHaveBeenCalledWith({ path: 'photos/p1.jpg', directory: Directory.Data });
  });

  it('lists the ids of stored photos', async () => {
    filesystem.readdir.mockResolvedValueOnce({ files: [{ name: 'p1.jpg' }, { name: 'tmp.txt' }, { name: 'p2.jpg' }] });

    expect(await store.list()).toEqual(['p1', 'p2']);
  });

  it('lists nothing before the first photo', async () => {
    filesystem.readdir.mockRejectedValueOnce(new Error('Folder does not exist'));

    expect(await store.list()).toEqual([]);
  });
});
