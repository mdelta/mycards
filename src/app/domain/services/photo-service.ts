import { ICON_IMAGE_SIZE, JPEG_QUALITY, PHOTO_MAX_EDGE } from '../model/photo';
import type { CardRepository } from '../ports/card-repository';
import type { IdGenerator } from '../ports/id-generator';
import type { ImageProcessor } from '../ports/image-processor';
import type { PhotoSource, PhotoSourceKind } from '../ports/photo-source';
import type { PhotoStore } from '../ports/photo-store';

/** Card photos and custom icon images (F-09, ADR-0003). */
export class PhotoService {
  constructor(
    private readonly source: PhotoSource,
    private readonly processor: ImageProcessor,
    private readonly store: PhotoStore,
    private readonly repository: CardRepository,
    private readonly ids: IdGenerator,
  ) {}

  /**
   * Gets an image from the camera or gallery, shrinks it and stores it as a new photo file. Resolves
   * the new photo id, or `undefined` if the user cancelled. The file is unused until a card refers to it.
   */
  async capture(source: PhotoSourceKind, kind: 'photo' | 'icon'): Promise<string | undefined> {
    const image = await this.source.pick(source);
    if (!image) {
      return undefined;
    }
    const data =
      kind === 'icon'
        ? await this.processor.cropSquare(image, ICON_IMAGE_SIZE, JPEG_QUALITY)
        : await this.processor.resize(image, PHOTO_MAX_EDGE, JPEG_QUALITY);
    const id = this.ids.newId();
    await this.store.write(id, data);
    return id;
  }

  read(id: string): Promise<Uint8Array | undefined> {
    return this.store.read(id);
  }

  /** Deletes photo files no card refers to (discarded edits, replaced or deleted photos). */
  pruneUnused(): Promise<void> {
    return pruneUnusedPhotos(this.repository, this.store);
  }
}

export async function pruneUnusedPhotos(repository: CardRepository, store: PhotoStore): Promise<void> {
  const used = new Set((await repository.findAll()).flatMap((card) => card.photos.map((photo) => photo.id)));
  for (const id of await store.list()) {
    if (!used.has(id)) {
      await store.delete(id);
    }
  }
}
