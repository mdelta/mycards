import { Directory, Encoding } from '@capacitor/filesystem';

import { CapacitorLockScreen } from './capacitor-lock-screen';

describe('CapacitorLockScreen', () => {
  let files: Map<string, string>;
  const filesystem = {
    writeFile: vi.fn(async ({ path, data }: { path: string; data: string }) => {
      files.set(path, data);
      return { uri: path };
    }),
    readdir: vi.fn(async () => ({
      files: [...files.keys()].map((path) => ({ name: path.split('/')[1] })),
    })),
    deleteFile: vi.fn(async ({ path }: { path: string }) => {
      files.delete(path);
    }),
  };
  const plugin = { requestAddTile: vi.fn(async () => ({ result: 'added' as const })) };

  beforeEach(() => {
    vi.clearAllMocks();
    files = new Map([
      ['lockscreen/card-0.png', 'old'],
      ['lockscreen/card-1.png', 'old'],
      ['lockscreen/card-2.png', 'old'],
    ]);
  });

  const lockScreen = (available = true): CapacitorLockScreen =>
    new CapacitorLockScreen(filesystem as never, plugin, available);

  it('writes the images and the card list, then deletes unused images', async () => {
    await lockScreen().replaceCards([
      { storeName: 'Shop "A"', cardId: '1', barcode: new Uint8Array([1, 2]) },
      { storeName: 'No barcode', cardId: '2' },
    ]);

    expect(filesystem.writeFile).toHaveBeenCalledWith({
      path: 'lockscreen/card-0.png',
      directory: Directory.Data,
      data: 'AQI=',
      recursive: true,
    });
    expect(filesystem.writeFile).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: 'lockscreen/cards.json', directory: Directory.Data, encoding: Encoding.UTF8 }),
    );
    expect(JSON.parse(files.get('lockscreen/cards.json')!)).toEqual({
      version: 1,
      cards: [
        { storeName: 'Shop "A"', cardId: '1', image: 'card-0.png' },
        { storeName: 'No barcode', cardId: '2' },
      ],
    });
    expect([...files.keys()].sort()).toEqual(['lockscreen/card-0.png', 'lockscreen/cards.json']);
  });

  it('leaves an empty list when writing an image fails', async () => {
    files.set('lockscreen/cards.json', JSON.stringify({ version: 1, cards: [{ storeName: 'Old', cardId: '9' }] }));
    filesystem.writeFile.mockImplementationOnce(async ({ path, data }) => {
      files.set(path, data);
      return { uri: path };
    });
    filesystem.writeFile.mockRejectedValueOnce(new Error('disk full'));

    await expect(
      lockScreen().replaceCards([{ storeName: 'New', cardId: '1', barcode: new Uint8Array([1]) }]),
    ).rejects.toThrow('disk full');

    expect(JSON.parse(files.get('lockscreen/cards.json')!)).toEqual({ version: 1, cards: [] });
  });

  it('ignores files that cannot be deleted', async () => {
    filesystem.deleteFile.mockRejectedValueOnce(new Error('busy'));

    await expect(lockScreen().replaceCards([])).resolves.toBeUndefined();
  });

  it('returns the tile request result of the native plugin', async () => {
    expect(await lockScreen().requestAddTile()).toBe('added');
    plugin.requestAddTile.mockRejectedValueOnce(new Error('not implemented'));
    expect(await lockScreen().requestAddTile()).toBe('failed');
  });

  it('cannot add a tile in the browser', async () => {
    expect(await lockScreen(false).requestAddTile()).toBe('failed');
    expect(plugin.requestAddTile).not.toHaveBeenCalled();
  });
});
