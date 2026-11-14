import { aCard } from '../../../testing/card-builder';
import { BackupError } from '../model/backup-error';

import { BACKUP_FORMAT, BACKUP_VERSION, parseBackupDocument, serializeBackupDocument } from './backup-document';

describe('backup document', () => {
  const fullCard = aCard({
    id: 'full',
    storeName: 'Store',
    cardId: 'A-4006381333931',
    barcodeValue: '4006381333931',
    barcodeType: 'EAN_13',
    note: 'Grüße 🎉',
    validFrom: '2026-01-01',
    expiry: '2027-01-01',
    balance: 1.23,
    balanceType: 'EUR',
    color: '#FFF44336',
    icon: 'cart',
    favorite: true,
    archived: true,
    showOnLockScreen: true,
    homepageUrl: 'https://example.com',
    shopSearchTerm: 'Store Berlin',
    lastUsedAt: '2026-02-01T00:00:00.000Z',
  });

  function documentWith(overrides: Record<string, unknown>): string {
    return JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: 'now',
      cards: [],
      ...overrides,
    });
  }

  function reasonOf(json: string): string | undefined {
    try {
      parseBackupDocument(json);
      return undefined;
    } catch (error) {
      return error instanceof BackupError ? error.reason : 'other';
    }
  }

  it('round-trips cards with all fields', () => {
    const json = serializeBackupDocument([fullCard, aCard({ id: 'min' })], '2026-11-14T12:00:00.000Z');

    expect(parseBackupDocument(json)).toEqual([fullCard, aCard({ id: 'min' })]);
  });

  it('writes format, version and export time', () => {
    const document = JSON.parse(serializeBackupDocument([], '2026-11-14T12:00:00.000Z'));

    expect(document).toEqual({
      format: 'mycards-backup',
      version: 1,
      exportedAt: '2026-11-14T12:00:00.000Z',
      cards: [],
    });
  });

  it('does not export tag ids yet, and imports cards without tags', () => {
    const json = serializeBackupDocument([aCard({ tagIds: ['t1'] })], 'now');

    expect(JSON.parse(json).cards[0]).not.toHaveProperty('tagIds');
    expect(parseBackupDocument(json)[0].tagIds).toEqual([]);
  });

  it('ignores unknown fields', () => {
    const card = { ...JSON.parse(serializeBackupDocument([aCard()], 'now')).cards[0], futureField: 1 };

    expect(parseBackupDocument(documentWith({ cards: [card], other: true }))).toEqual([aCard()]);
  });

  it('rejects files from a newer app version', () => {
    expect(reasonOf(documentWith({ version: BACKUP_VERSION + 1 }))).toBe('newerVersion');
  });

  it.each([
    ['not JSON', '{'],
    ['not an object', '[]'],
    ['another format', JSON.stringify({ format: 'other', version: 1, cards: [] })],
    ['a non-integer version', documentWith({ version: '1' })],
    ['missing cards', documentWith({ cards: undefined })],
  ])('rejects %s', (_, json) => {
    expect(reasonOf(json)).toBe('invalidContent');
  });

  it.each([
    ['a non-object card', 'card'],
    ['a missing id', { ...aCard(), id: undefined }],
    ['an empty id', { ...aCard(), id: '' }],
    ['the reserved id "new"', { ...aCard(), id: 'new' }],
    ['an id with a slash', { ...aCard(), id: 'a/b' }],
    ['an over-long id', { ...aCard(), id: 'a'.repeat(65) }],
    ['a missing store name', { ...aCard(), storeName: undefined }],
    ['an empty store name', { ...aCard(), storeName: ' ' }],
    ['a non-boolean favorite', { ...aCard(), favorite: 'yes' }],
    ['a missing creation time', { ...aCard(), createdAt: undefined }],
    ['an unknown barcode type', { ...aCard(), barcodeType: 'MAXICODE' }],
    ['a value that does not fit the barcode type', { ...aCard(), barcodeType: 'EAN_13', cardId: '4006381333932' }],
    ['a non-numeric balance', { ...aCard(), balance: '1' }],
    ['a negative balance', { ...aCard(), balance: -1 }],
    ['a non-string note', { ...aCard(), note: 1 }],
  ])('rejects a card with %s', (_, card) => {
    expect(reasonOf(documentWith({ cards: [card] }))).toBe('invalidContent');
  });

  it('rejects duplicate card ids', () => {
    expect(reasonOf(documentWith({ cards: [aCard(), aCard()] }))).toBe('invalidContent');
  });
});
