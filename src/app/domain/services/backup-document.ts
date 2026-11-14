import { BackupError } from '../model/backup-error';
import { isBarcodeType } from '../model/barcode-type';
import type { Card } from '../model/card';

import { validateCardDraft } from './card-draft';

/** Own export format (ADR-0004), specified in docs/formats/mycards-backup.md. */
export const BACKUP_FORMAT = 'mycards-backup';
export const BACKUP_VERSION = 1;
export const BACKUP_DOCUMENT_NAME = 'mycards.json';

type ExportedCard = Omit<Card, 'tagIds'>;

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

/** Version 1 has no tags yet (step 6); `tagIds` is therefore not exported. */
export function serializeBackupDocument(cards: readonly Card[], exportedAt: string): string {
  const exported: ExportedCard[] = cards.map(({ tagIds: _, ...card }) => card);
  return JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt, cards: exported }, null, 2);
}

/** Parses and validates a whole document; any invalid card rejects the file (nothing is imported). */
export function parseBackupDocument(json: string): Card[] {
  const document = parseJson(json);
  if (!isRecord(document) || document['format'] !== BACKUP_FORMAT || !Number.isInteger(document['version'])) {
    throw new BackupError('invalidContent');
  }
  if ((document['version'] as number) > BACKUP_VERSION) {
    throw new BackupError('newerVersion');
  }
  const rawCards = document['cards'];
  if (!Array.isArray(rawCards)) {
    throw new BackupError('invalidContent');
  }
  const cards = rawCards.map(parseCard);
  if (new Set(cards.map((card) => card.id)).size !== cards.length) {
    throw new BackupError('invalidContent');
  }
  return cards;
}

function parseCard(raw: unknown): Card {
  if (!isRecord(raw)) {
    throw new BackupError('invalidContent');
  }
  const card: Record<string, unknown> = { tagIds: [] };
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
  const result = card as unknown as Card;
  if (!result.id || validateCardDraft(result).length) {
    throw new BackupError('invalidContent');
  }
  return result;
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
