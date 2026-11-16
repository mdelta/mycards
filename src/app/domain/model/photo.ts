import type { Photo, PhotoRole } from './card';

/** Photo storage limits (ADR-0003): keeps backups small for the Auto Backup quota (arc42 11.1). */
export const PHOTO_MAX_EDGE = 1600;
export const ICON_IMAGE_SIZE = 256;
export const JPEG_QUALITY = 0.8;

/** Roles a card has at most once. */
const SINGLE_ROLES: readonly PhotoRole[] = ['front', 'back', 'icon'];

export interface Size {
  width: number;
  height: number;
}

/** Scales down (never up) so that the longer edge is at most `maxEdge`, keeping the aspect ratio. */
export function fitWithin(size: Size, maxEdge: number): Size {
  const scale = Math.min(1, maxEdge / Math.max(size.width, size.height));
  return { width: Math.max(1, Math.round(size.width * scale)), height: Math.max(1, Math.round(size.height * scale)) };
}

/** The largest centered square of an image. */
export function centerSquare(size: Size): { x: number; y: number; size: number } {
  const edge = Math.min(size.width, size.height);
  return { x: Math.floor((size.width - edge) / 2), y: Math.floor((size.height - edge) / 2), size: edge };
}

export function photoOf(photos: readonly Photo[], role: PhotoRole): Photo | undefined {
  return photos.find((photo) => photo.role === role);
}

/** Replaces the photo of a single role (`front`, `back`, `icon`); `undefined` removes it. */
export function withPhoto(photos: readonly Photo[], role: PhotoRole, id: string | undefined): Photo[] {
  const others = photos.filter((photo) => photo.role !== role);
  if (!id) {
    return others;
  }
  const index = photos.findIndex((photo) => photo.role === role);
  const result = [...others];
  result.splice(index < 0 ? result.length : index, 0, { id, role });
  return result;
}

/** Unique ids and at most one photo per single role. */
export function arePhotosValid(photos: readonly Photo[]): boolean {
  return (
    new Set(photos.map((photo) => photo.id)).size === photos.length &&
    SINGLE_ROLES.every((role) => photos.filter((photo) => photo.role === role).length <= 1)
  );
}
