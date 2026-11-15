import type { PipeTransform } from '@angular/core';
import { Injectable, Pipe, inject } from '@angular/core';

import { toBase64 } from '../infrastructure/backup/base64';
import { PHOTO_STORE } from '../infrastructure/providers';

const NONE = Promise.resolve(undefined);

/** Data URLs of stored photos. Photo files never change (a new photo gets a new id), so they are cached. */
@Injectable({ providedIn: 'root' })
export class PhotoUrls {
  private readonly store = inject(PHOTO_STORE);
  private readonly cache = new Map<string, Promise<string | undefined>>();

  url(id: string): Promise<string | undefined> {
    let url = this.cache.get(id);
    if (!url) {
      url = this.store.read(id).then((data) => data && `data:image/jpeg;base64,${toBase64(data)}`);
      this.cache.set(id, url);
    }
    return url;
  }
}

/** `photoId | photoUrl | async` shows a stored photo. */
@Pipe({ name: 'photoUrl' })
export class PhotoUrlPipe implements PipeTransform {
  private readonly urls = inject(PhotoUrls);

  transform(id: string | undefined): Promise<string | undefined> {
    return id ? this.urls.url(id) : NONE;
  }
}
