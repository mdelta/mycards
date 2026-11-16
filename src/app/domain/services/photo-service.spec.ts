import { aCard } from '../../../testing/card-builder';
import { InMemoryCardRepository } from '../../../testing/in-memory-card-repository';
import { InMemoryPhotoStore } from '../../../testing/in-memory-photo-store';
import { ICON_IMAGE_SIZE, JPEG_QUALITY, PHOTO_MAX_EDGE } from '../model/photo';
import type { ImageProcessor } from '../ports/image-processor';

import { PhotoService } from './photo-service';

describe('PhotoService', () => {
  const original = new Uint8Array([1]);
  let picked: Uint8Array | undefined;
  let store: InMemoryPhotoStore;
  let repository: InMemoryCardRepository;
  const processor = {
    resize: vi.fn(async () => new Uint8Array([2])),
    cropSquare: vi.fn(async () => new Uint8Array([3])),
  } satisfies ImageProcessor;
  const source = { pick: vi.fn(async () => picked) };
  let service: PhotoService;

  beforeEach(() => {
    vi.clearAllMocks();
    picked = original;
    store = new InMemoryPhotoStore();
    repository = new InMemoryCardRepository();
    service = new PhotoService(source, processor, store, repository, { newId: () => 'p1' });
  });

  it('shrinks a photo and stores it under a new id', async () => {
    expect(await service.capture('camera', 'photo')).toBe('p1');

    expect(source.pick).toHaveBeenCalledWith('camera');
    expect(processor.resize).toHaveBeenCalledWith(original, PHOTO_MAX_EDGE, JPEG_QUALITY);
    expect(await service.read('p1')).toEqual(new Uint8Array([2]));
  });

  it('crops an icon image to a small square', async () => {
    await service.capture('gallery', 'icon');

    expect(processor.cropSquare).toHaveBeenCalledWith(original, ICON_IMAGE_SIZE, JPEG_QUALITY);
    expect(await store.read('p1')).toEqual(new Uint8Array([3]));
  });

  it('stores nothing if the user cancels', async () => {
    picked = undefined;

    expect(await service.capture('camera', 'photo')).toBeUndefined();
    expect(await store.list()).toEqual([]);
  });

  it('deletes files that no card refers to', async () => {
    await repository.save(aCard({ photos: [{ id: 'used', role: 'front' }] }));
    store.files.set('used', original);
    store.files.set('orphan', original);

    await service.pruneUnused();

    expect(await store.list()).toEqual(['used']);
  });
});
