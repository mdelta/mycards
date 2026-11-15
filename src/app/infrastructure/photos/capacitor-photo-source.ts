import type { CameraPlugin, MediaResult } from '@capacitor/camera';
import { MediaTypeSelection } from '@capacitor/camera';

import type { PhotoSource, PhotoSourceKind } from '../../domain/ports/photo-source';
import { fromBase64 } from '../backup/base64';

/**
 * `PhotoSource` via `@capacitor/camera` (F-09): the system camera app and Android's photo picker, so
 * MyCards needs no camera or storage permission. In the browser, both use a file input.
 */
export class CapacitorPhotoSource implements PhotoSource {
  constructor(
    private readonly camera: Pick<CameraPlugin, 'takePhoto' | 'chooseFromGallery'>,
    private readonly fetchUrl: (url: string) => Promise<Pick<Response, 'arrayBuffer'>> = (url) => fetch(url),
  ) {}

  async pick(source: PhotoSourceKind): Promise<Uint8Array | undefined> {
    let result: MediaResult | undefined;
    try {
      result =
        source === 'camera'
          ? await this.camera.takePhoto({ correctOrientation: true, webUseInput: true })
          : (await this.camera.chooseFromGallery({ mediaType: MediaTypeSelection.Photo, webUseInput: true }))
              .results[0];
    } catch (error) {
      if (error instanceof Error && /cancel/i.test(error.message)) {
        return undefined;
      }
      throw error;
    }
    return result && this.read(result);
  }

  private async read(result: MediaResult): Promise<Uint8Array | undefined> {
    if (result.webPath) {
      return new Uint8Array(await (await this.fetchUrl(result.webPath)).arrayBuffer());
    }
    return result.thumbnail ? fromBase64(result.thumbnail) : undefined;
  }
}
