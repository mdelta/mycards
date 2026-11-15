import { TestBed } from '@angular/core/testing';

import { InMemoryPhotoStore } from '../../testing/in-memory-photo-store';
import { PHOTO_STORE } from '../infrastructure/providers';

import { PhotoUrlPipe, PhotoUrls } from './photo-url.pipe';

describe('PhotoUrls', () => {
  let store: InMemoryPhotoStore;

  beforeEach(() => {
    store = new InMemoryPhotoStore({ p1: new Uint8Array([1, 2, 3]) });
    TestBed.configureTestingModule({ providers: [{ provide: PHOTO_STORE, useValue: store }] });
  });

  it('turns a stored photo into a JPEG data URL and caches it', async () => {
    const urls = TestBed.inject(PhotoUrls);
    const read = vi.spyOn(store, 'read');

    expect(await urls.url('p1')).toBe('data:image/jpeg;base64,AQID');
    expect(await urls.url('p1')).toBe('data:image/jpeg;base64,AQID');
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('resolves undefined for a missing photo or no id', async () => {
    const pipe = TestBed.runInInjectionContext(() => new PhotoUrlPipe());

    expect(await pipe.transform('missing')).toBeUndefined();
    expect(await pipe.transform(undefined)).toBeUndefined();
    expect(pipe.transform(undefined)).toBe(pipe.transform(undefined));
  });
});
