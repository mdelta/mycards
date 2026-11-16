import { BackupError } from '../model/backup-error';
import { isBarcodeType } from '../model/barcode-type';
import type { Card, Photo, Tag, WebsiteLink } from '../model/card';
import { PHOTO_ROLES } from '../model/card';
import { isCardColor } from '../model/card-appearance';
import { arePhotosValid } from '../model/photo';

import { validateCardDraft } from './card-draft';
import { isWebUrl } from './links';

/** Own export format (ADR-0004), specified in docs/formats/mycards-backup.md. */
export const BACKUP_FORMAT = 'mycards-backup';
export const BACKUP_VERSION = 2;
export const BACKUP_DOCUMENT_NAME = 'mycards.json';

/** Version 1 had no tags and websites; version 2 added them. */
const TAGS_VERSION = 2;

export interface BackupContent {
  cards: Card[];
  tags: Tag[];
  /** Photo files by photo id, stored as `photos/<id>.jpg` in the archive. */
  photos?: ReadonlyMap<string, Uint8Array>;
  /** Format of the file read; Catima cards are always added as new cards (ADR-0004). */
  format?: 'mycards' | 'catima';
  /** Catima cards imported without barcode type because MyCards cannot show their barcode. */
  unsupportedBarcodes?: { storeName: string; barcodeType: string }[];
}

export function photoEntryName(id: string): string {
  return `photos/${id}.jpg`;
}

/** Ids appear in routes (`/cards/:id`); `new` is the creation route. */
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const RESERVED_IDS = ['new'];

const REQUIRED_TEXT = ['id', 'storeName', 'cardId', 'createdAt', 'updatedAt'] as const;
const OPTIONAL_TEXT = [
  'barcodeValue',
  'note',
  'validFrom',
  'expiry',
  'balanceType',
  'color',
  'icon',
  'homepageUrl',
  'shopSearchTerm',
  'lastUsedAt',
] as const;
const FLAGS = ['favorite', 'archived', 'showOnLockScreen'] as const;

export function serializeBackupDocument(content: BackupContent, exportedAt: string): string {
  const { cards, tags } = content;
  // Photo files travel next to the document, not inside it.
  return JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt, tags, cards }, null, 2);
}

/** Parses and validates a whole document; any invalid card or tag rejects the file (nothing is imported). */
export function parseBackupDocument(json: string): BackupContent {
  const document = parseJson(json);
  if (!isRecord(document) || document['format'] !== BACKUP_FORMAT || !Number.isInteger(document['version'])) {
    throw new BackupError('invalidContent');
  }
  const version = document['version'] as number;
  if (version > BACKUP_VERSION) {
    throw new BackupError('newerVersion');
  }
  const tags = version >= TAGS_VERSION ? arrayOf(document['tags']).map(parseTag) : [];
  const tagIds = new Set(tags.map((tag) => tag.id));
  if (tagIds.size !== tags.length || new Set(tags.map((tag) => tag.name.toLocaleLowerCase())).size !== tags.length) {
    throw new BackupError('invalidContent');
  }
  const cards = arrayOf(document['cards']).map((raw) => parseCard(raw, version, tagIds));
  const photoIds = cards.flatMap((card) => card.photos.map((photo) => photo.id));
  if (new Set(cards.map((card) => card.id)).size !== cards.length || new Set(photoIds).size !== photoIds.length) {
    throw new BackupError('invalidContent');
  }
  return { cards, tags };
}

function parseTag(raw: unknown): Tag {
  if (!isRecord(raw)) {
    throw new BackupError('invalidContent');
  }
  const id = ofType(raw['id'], 'string') as string;
  const name = (ofType(raw['name'], 'string') as string).trim();
  if (!isValidId(id) || !name) {
    throw new BackupError('invalidContent');
  }
  return { id, name };
}

function parsePhoto(raw: unknown): Photo {
  if (!isRecord(raw)) {
    throw new BackupError('invalidContent');
  }
  const id = ofType(raw['id'], 'string') as string;
  const role = ofType(raw['role'], 'string') as Photo['role'];
  if (!isValidId(id) || !PHOTO_ROLES.includes(role)) {
    throw new BackupError('invalidContent');
  }
  return { id, role };
}

function parseWebsite(raw: unknown): WebsiteLink {
  if (!isRecord(raw)) {
    throw new BackupError('invalidContent');
  }
  const url = ofType(raw['url'], 'string') as string;
  return raw['label'] === undefined ? { url } : { label: ofType(raw['label'], 'string') as string, url };
}

/** Version 1 did not restrict `color` and `homepageUrl`; values the app cannot use are dropped. */
function dropLegacyValues(card: Record<string, unknown>): void {
  if (typeof card['color'] === 'string' && !isCardColor(card['color'])) {
    delete card['color'];
  }
  if (typeof card['homepageUrl'] === 'string' && !isWebUrl(card['homepageUrl'])) {
    delete card['homepageUrl'];
  }
}

function parseCard(raw: unknown, version: number, tagIds: ReadonlySet<string>): Card {
  if (!isRecord(raw)) {
    throw new BackupError('invalidContent');
  }
  const card: Record<string, unknown> = { tagIds: [], websites: [], photos: [] };
  if (version >= TAGS_VERSION) {
    const ids = arrayOf(raw['tagIds'] ?? []).map((id) => ofType(id, 'string') as string);
    if (new Set(ids).size !== ids.length || ids.some((id) => !tagIds.has(id))) {
      throw new BackupError('invalidContent');
    }
    card['tagIds'] = ids;
    card['websites'] = arrayOf(raw['websites'] ?? []).map(parseWebsite);
    card['photos'] = arrayOf(raw['photos'] ?? []).map(parsePhoto);
  }
  for (const field of REQUIRED_TEXT) {
    card[field] = ofType(raw[field], 'string');
  }
  for (const field of FLAGS) {
    card[field] = ofType(raw[field], 'boolean');
  }
  for (const field of OPTIONAL_TEXT) {
    if (raw[field] !== undefined) {
      card[field] = ofType(raw[field], 'string');
    }
  }
  if (raw['balance'] !== undefined) {
    card['balance'] = ofType(raw['balance'], 'number');
  }
  if (raw['barcodeType'] !== undefined) {
    const type = ofType(raw['barcodeType'], 'string') as string;
    if (!isBarcodeType(type)) {
      throw new BackupError('invalidContent');
    }
    card['barcodeType'] = type;
  }
  if (version < TAGS_VERSION) {
    dropLegacyValues(card);
  }
  const result = card as unknown as Card;
  if (!isValidId(result.id) || !arePhotosValid(result.photos) || validateCardDraft(result).length) {
    throw new BackupError('invalidContent');
  }
  return result;
}

function isValidId(id: string): boolean {
  return ID_PATTERN.test(id) && !RESERVED_IDS.includes(id);
}

function arrayOf(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new BackupError('invalidContent');
  }
  return value;
}

function ofType(value: unknown, type: 'string' | 'boolean' | 'number'): unknown {
  if (typeof value !== type) {
    throw new BackupError('invalidContent');
  }
  return value;
}

function parseJson(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    throw new BackupError('invalidContent');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
