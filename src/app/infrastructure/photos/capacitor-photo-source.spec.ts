import { MediaType, MediaTypeSelection } from '@capacitor/camera';

import { CapacitorPhotoSource } from './capacitor-photo-source';

describe('CapacitorPhotoSource', () => {
  const photo = { type: MediaType.Photo, saved: false, webPath: 'http://localhost/_capacitor_file_/p.jpg' };
  const camera = {
    takePhoto: vi.fn(async () => photo),
    chooseFromGallery: vi.fn(async () => ({ results: [photo] })),
  };
  const fetchUrl = vi.fn(async () => ({ arrayBuffer: async () => new Uint8Array([1, 2]).buffer }));
  const source = new CapacitorPhotoSource(camera, fetchUrl);

  beforeEach(() => vi.clearAllMocks());

  it('takes a photo with the camera app and reads it from its web path', async () => {
    expect(await source.pick('camera')).toEqual(new Uint8Array([1, 2]));

    expect(camera.takePhoto).toHaveBeenCalledWith({ correctOrientation: true, webUseInput: true });
    expect(fetchUrl).toHaveBeenCalledWith(photo.webPath);
  });

  it('picks one photo from the gallery', async () => {
    expect(await source.pick('gallery')).toEqual(new Uint8Array([1, 2]));

    expect(camera.chooseFromGallery).toHaveBeenCalledWith({ mediaType: MediaTypeSelection.Photo, webUseInput: true });
  });

  it('falls back to the base64 image the browser returns', async () => {
    camera.takePhoto.mockResolvedValueOnce({ type: MediaType.Photo, saved: false, thumbnail: 'AQID' } as never);

    expect(await source.pick('camera')).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('resolves undefined without a result', async () => {
    camera.chooseFromGallery.mockResolvedValueOnce({ results: [] });
    expect(await source.pick('gallery')).toBeUndefined();

    camera.takePhoto.mockResolvedValueOnce({ type: MediaType.Photo, saved: false } as never);
    expect(await source.pick('camera')).toBeUndefined();
  });

  it('resolves undefined when the user cancels', async () => {
    camera.takePhoto.mockRejectedValueOnce(new Error('User cancelled photos app'));

    expect(await source.pick('camera')).toBeUndefined();
  });

  it('passes on other errors', async () => {
    camera.takePhoto.mockRejectedValueOnce(new Error('No camera available'));

    await expect(source.pick('camera')).rejects.toThrow('No camera available');
  });
});
