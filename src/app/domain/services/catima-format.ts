import { BackupError } from '../model/backup-error';
import { isBarcodeType } from '../model/barcode-type';
import type { Card, Photo, PhotoRole, Tag } from '../model/card';
import { cardColorOf } from '../model/card-appearance';

import type { BackupContent } from './backup-document';
import { barcodeValueOf } from './barcode-value';
import type { CardDraft } from './card-draft';
import { normalizeCardDraft, validateCardDraft } from './card-draft';
import { parseCsv, toCsv } from './csv';

/**
 * Catima export format, implemented from observed export files only (ADR-0004, ADR-0007); described in
 * docs/formats/catima-export.md.
 */
export const CATIMA_DOCUMENT_NAME = 'catima.csv';
const CATIMA_VERSION = '2';
const CARD_COLUMNS = [
  '_id',
  'store',
  'note',
  'validfrom',
  'expiry',
  'balance',
  'balancetype',
  'cardid',
  'barcodeid',
  'barcodetype',
  'barcodeencoding',
  'headercolor',
  'starstatus',
  'lastused',
  'archive',
] as const;
const LINK_COLUMNS = ['cardId', 'groupId'];
/** Photo roles Catima knows; `other` photos are not exported. */
const CATIMA_PHOTO_ROLES: readonly PhotoRole[] = ['front', 'back', 'icon'];

type CatimaRow = Record<(typeof CARD_COLUMNS)[number], string>;

export interface CatimaData {
  groups: string[];
  cards: CatimaRow[];
  links: { cardId: string; groupId: string }[];
}

export type UnsupportedBarcode = NonNullable<BackupContent['unsupportedBarcodes']>[number];

export interface CatimaImport {
  content: BackupContent;
  /** Archive entry of each imported photo, by new photo id. */
  photoEntries: Map<string, { entry: string; role: PhotoRole }>;
  unsupportedBarcodes: UnsupportedBarcode[];
}

/** MyCards fields Catima has no counterpart for; they are lost in a Catima export. */
export type CatimaLoss = 'homepage' | 'websites' | 'icon' | 'shopSearchTerm' | 'lockScreen' | 'otherPhotos';

export function catimaPhotoEntry(catimaId: string, role: PhotoRole): string {
  return `card_${catimaId}_${role}.png`;
}

export function parseCatimaCsv(text: string): CatimaData {
  const [version, groups, cards, links, ...rest] = splitSections(parseCsv(text.replace(/^\uFEFF/, '')));
  if (
    version?.length !== 1 ||
    version[0].join() !== CATIMA_VERSION ||
    groups?.[0]?.join() !== '_id' ||
    cards?.[0]?.join() !== CARD_COLUMNS.join() ||
    links?.[0]?.join() !== LINK_COLUMNS.join() ||
    rest.length
  ) {
    throw new BackupError('invalidContent');
  }
  return {
    groups: groups.slice(1).map((row) => single(row)),
    cards: cards.slice(1).map((row) => {
      if (row.length !== CARD_COLUMNS.length) {
        throw new BackupError('invalidContent');
      }
      return Object.fromEntries(CARD_COLUMNS.map((column, i) => [column, row[i]])) as CatimaRow;
    }),
    links: links.slice(1).map((row) => {
      if (row.length !== 2) {
        throw new BackupError('invalidContent');
      }
      return { cardId: row[0], groupId: row[1] };
    }),
  };
}

/** Maps Catima cards to new MyCards cards: a Catima import never replaces existing cards (ADR-0004). */
export function fromCatima(
  data: CatimaData,
  entryNames: ReadonlySet<string>,
  now: string,
  newId: () => string,
): CatimaImport {
  const tags: Tag[] = [];
  const tagIdByName = new Map<string, string>();
  for (const name of data.groups.map((group) => group.trim()).filter(Boolean)) {
    const key = name.toLocaleLowerCase();
    if (!tagIdByName.has(key)) {
      const tag = { id: newId(), name };
      tags.push(tag);
      tagIdByName.set(key, tag.id);
    }
  }
  const photoEntries = new Map<string, { entry: string; role: PhotoRole }>();
  const unsupportedBarcodes: UnsupportedBarcode[] = [];
  const cards = data.cards.map((row): Card => {
    const tagIds = data.links
      .filter((link) => link.cardId === row._id)
      .map((link) => tagIdByName.get(link.groupId.trim().toLocaleLowerCase()))
      .filter((id): id is string => !!id);
    const draft = normalizeCardDraft({
      storeName: row.store,
      cardId: row.cardid,
      barcodeValue: row.barcodeid,
      barcodeType: isBarcodeType(row.barcodetype) ? row.barcodetype : undefined,
      note: row.note,
      validFrom: dateOf(row.validfrom),
      expiry: dateOf(row.expiry),
      balance: balanceOf(row.balance, row.balancetype),
      balanceType: row.balancetype,
      color: colorOf(row.headercolor),
      favorite: row.starstatus === '1',
      tagIds,
    });
    if (row.barcodetype && (!draft.barcodeType || validateCardDraft(draft).includes('barcodeValueInvalid'))) {
      unsupportedBarcodes.push({ storeName: draft.storeName ?? '', barcodeType: row.barcodetype });
      draft.barcodeType = undefined;
    }
    if (validateCardDraft(draft).length) {
      throw new BackupError('invalidContent');
    }
    const photos: Photo[] = [];
    for (const role of CATIMA_PHOTO_ROLES) {
      const entry = catimaPhotoEntry(row._id, role);
      if (entryNames.has(entry)) {
        const id = newId();
        photos.push({ id, role });
        photoEntries.set(id, { entry, role });
      }
    }
    return withoutUndefined({
      showOnLockScreen: false,
      websites: [],
      tagIds: [],
      ...(draft as Required<Pick<CardDraft, 'storeName' | 'cardId' | 'favorite'>> & CardDraft),
      id: newId(),
      archived: row.archive === '1',
      photos,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: lastUsedOf(row.lastused),
    });
  });
  return { content: { cards, tags }, photoEntries, unsupportedBarcodes };
}

/** Writes `catima.csv`; Catima ids are numbered from 1 in card order. */
export function toCatima(
  cards: readonly Card[],
  tags: readonly Tag[],
): { csv: string; photos: { id: string; entry: string }[] } {
  const tagNames = new Map(tags.map((tag) => [tag.id, tag.name]));
  const rows: string[][] = [[CATIMA_VERSION], [], ['_id'], ...tags.map((tag) => [tag.name]), [], [...CARD_COLUMNS]];
  const links: string[][] = [];
  const photos: { id: string; entry: string }[] = [];
  cards.forEach((card, index) => {
    const id = String(index + 1);
    const value = barcodeValueOf(card);
    rows.push([
      id,
      card.storeName,
      card.note ?? '',
      millisOf(card.validFrom),
      millisOf(card.expiry),
      String(card.balance ?? 0),
      card.balanceType ?? '',
      card.cardId,
      card.barcodeValue ?? '',
      card.barcodeType ?? '',
      [...value].every((char) => char.codePointAt(0)! <= 0xff) ? 'ISO-8859-1' : 'UTF-8',
      String(0xff000000 | parseInt(cardColorOf(card).slice(1), 16)),
      card.favorite ? '1' : '0',
      String(Math.floor(Date.parse(card.lastUsedAt ?? card.updatedAt) / 1000)),
      card.archived ? '1' : '0',
    ]);
    for (const tagId of card.tagIds) {
      links.push([id, tagNames.get(tagId) ?? tagId]);
    }
    for (const photo of card.photos.filter((p) => CATIMA_PHOTO_ROLES.includes(p.role))) {
      photos.push({ id: photo.id, entry: catimaPhotoEntry(id, photo.role) });
    }
  });
  rows.push([], [...LINK_COLUMNS], ...links);
  return { csv: toCsv(rows), photos };
}

export function catimaLosses(cards: readonly Card[]): CatimaLoss[] {
  const checks: [CatimaLoss, (card: Card) => boolean][] = [
    ['homepage', (card) => !!card.homepageUrl],
    ['websites', (card) => card.websites.length > 0],
    ['icon', (card) => !!card.icon],
    ['shopSearchTerm', (card) => !!card.shopSearchTerm],
    ['lockScreen', (card) => card.showOnLockScreen],
    ['otherPhotos', (card) => card.photos.some((photo) => photo.role === 'other')],
  ];
  return checks.filter(([, lost]) => cards.some(lost)).map(([loss]) => loss);
}

function splitSections(rows: string[][]): string[][][] {
  const sections: string[][][] = [[]];
  for (const row of rows) {
    if (row.length) {
      sections[sections.length - 1].push(row);
    } else if (sections[sections.length - 1].length) {
      sections.push([]);
    }
  }
  return sections.filter((section) => section.length);
}

function single(row: string[]): string {
  if (row.length !== 1) {
    throw new BackupError('invalidContent');
  }
  return row[0];
}

function numberOf(text: string): number {
  const value = Number(text);
  if (!text.trim() || !Number.isFinite(value)) {
    throw new BackupError('invalidContent');
  }
  return value;
}

/** Catima stores dates as Unix milliseconds at midnight UTC. */
function dateOf(text: string): string | undefined {
  return text ? new Date(numberOf(text)).toISOString().slice(0, 10) : undefined;
}

function millisOf(date: string | undefined): string {
  return date ? String(Date.parse(`${date}T00:00:00Z`)) : '';
}

/** Catima writes `0` for cards without a balance. */
function balanceOf(text: string, type: string): number | undefined {
  if (!text) {
    return undefined;
  }
  const balance = numberOf(text);
  return balance === 0 && !type.trim() ? undefined : balance;
}

/** Signed 32-bit ARGB integer → `#RRGGBB` (alpha is dropped). */
function colorOf(text: string): string | undefined {
  if (!text) {
    return undefined;
  }
  return `#${(numberOf(text) & 0xffffff).toString(16).toUpperCase().padStart(6, '0')}`;
}

/** Unix seconds, unlike the date columns. */
function lastUsedOf(text: string): string | undefined {
  const seconds = text ? numberOf(text) : 0;
  return seconds > 0 ? new Date(seconds * 1000).toISOString() : undefined;
}

function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}
