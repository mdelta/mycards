export type PhotoSourceKind = 'camera' | 'gallery';

/** Takes a photo or picks one from the gallery (F-09); resolves `undefined` if the user cancels. */
export interface PhotoSource {
  pick(source: PhotoSourceKind): Promise<Uint8Array | undefined>;
}
