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
    color: '#F44336',
    icon: 'cart',
    favorite: true,
    archived: true,
    showOnLockScreen: true,
    homepageUrl: 'https://example.com',
    shopSearchTerm: 'Store Berlin',
    tagIds: ['t2', 't1'],
    websites: [{ label: 'Shop', url: 'https://shop.example.com' }, { url: 'http://example.org' }],
    lastUsedAt: '2026-02-01T00:00:00.000Z',
  });

  const tags = [
    { id: 't1', name: 'Food' },
    { id: 't2', name: 'Drugstore' },
  ];

  function documentWith(overrides: Record<string, unknown>): string {
    return JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: 'now',
      tags: [],
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
    const content = { cards: [fullCard, aCard({ id: 'min' })], tags };
    const json = serializeBackupDocument(content, '2026-11-14T12:00:00.000Z');

    expect(parseBackupDocument(json)).toEqual(content);
  });

  it('writes format, version and export time', () => {
    const document = JSON.parse(serializeBackupDocument({ cards: [], tags: [] }, '2026-11-14T12:00:00.000Z'));

    expect(document).toEqual({
      format: 'mycards-backup',
      version: 2,
      exportedAt: '2026-11-14T12:00:00.000Z',
      tags: [],
      cards: [],
    });
  });

  it('still reads version 1 files, which have no tags and websites', () => {
    const v1Card = { ...aCard(), tagIds: ['t1'], websites: [{ url: 'https://a.de' }] };
    const json = documentWith({ version: 1, tags: undefined, cards: [v1Card] });

    expect(parseBackupDocument(json)).toEqual({ cards: [aCard()], tags: [] });
  });

  it('drops version 1 colors and homepages that the app cannot use', () => {
    const legacy = { ...aCard(), color: '#FFF44336', homepageUrl: 'intent://scan#Intent;end' };
    const kept = { ...aCard({ id: 'kept' }), color: '#C62828', homepageUrl: 'https://a.de' };
    const json = documentWith({ version: 1, tags: undefined, cards: [legacy, kept] });

    expect(parseBackupDocument(json).cards).toEqual([aCard(), { ...kept, tagIds: [], websites: [] }]);
  });

  it('defaults missing tag ids and websites to empty lists', () => {
    const { tagIds: _, websites: __, ...card } = aCard();

    expect(parseBackupDocument(documentWith({ cards: [card] })).cards).toEqual([aCard()]);
  });

  it.each([
    ['missing tags', { tags: undefined }],
    ['a non-object tag', { tags: ['Food'] }],
    ['a tag with an invalid id', { tags: [{ id: 'a/b', name: 'Food' }] }],
    ['a tag without a name', { tags: [{ id: 't1', name: ' ' }] }],
    [
      'duplicate tag ids',
      {
        tags: [
          { id: 't1', name: 'A' },
          { id: 't1', name: 'B' },
        ],
      },
    ],
    [
      'duplicate tag names',
      {
        tags: [
          { id: 't1', name: 'Food' },
          { id: 't2', name: 'food' },
        ],
      },
    ],
    ['an unknown tag id', { cards: [{ ...aCard(), tagIds: ['t9'] }] }],
    ['a duplicate tag id on a card', { tags, cards: [{ ...aCard(), tagIds: ['t1', 't1'] }] }],
    ['non-array tag ids', { tags, cards: [{ ...aCard(), tagIds: 't1' }] }],
    ['a non-object website', { cards: [{ ...aCard(), websites: ['https://a.de'] }] }],
    ['a website without URL', { cards: [{ ...aCard(), websites: [{ label: 'A' }] }] }],
    ['a website with a non-text label', { cards: [{ ...aCard(), websites: [{ label: 1, url: 'https://a.de' }] }] }],
    ['an invalid website URL', { cards: [{ ...aCard(), websites: [{ url: 'javascript:alert(1)' }] }] }],
    ['an invalid homepage URL', { cards: [{ ...aCard(), homepageUrl: 'a.de' }] }],
    ['an invalid color', { cards: [{ ...aCard(), color: '#FFF44336' }] }],
  ])('rejects %s', (_, overrides) => {
    expect(reasonOf(documentWith(overrides))).toBe('invalidContent');
  });

  it('ignores unknown fields', () => {
    const card = {
      ...JSON.parse(serializeBackupDocument({ cards: [aCard()], tags: [] }, 'now')).cards[0],
      futureField: 1,
    };

    expect(parseBackupDocument(documentWith({ cards: [card], other: true }))).toEqual({ cards: [aCard()], tags: [] });
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

  describe('photos', () => {
    const withPhotos = (photos: unknown): string => documentWith({ cards: [{ ...aCard(), photos }] });

    it('round-trips photo references', () => {
      const card = aCard({
        photos: [
          { id: 'p1', role: 'front' },
          { id: 'p2', role: 'other' },
          { id: 'p3', role: 'other' },
        ],
      });

      expect(parseBackupDocument(serializeBackupDocument({ cards: [card], tags: [] }, 'now')).cards).toEqual([card]);
    });

    it('defaults missing photos to an empty list', () => {
      const { photos: _, ...card } = aCard();

      expect(parseBackupDocument(documentWith({ cards: [card] })).cards[0].photos).toEqual([]);
    });

    it.each([
      ['an unknown role', [{ id: 'p1', role: 'selfie' }]],
      ['an invalid id', [{ id: '../x', role: 'front' }]],
      [
        'two front photos',
        [
          { id: 'p1', role: 'front' },
          { id: 'p2', role: 'front' },
        ],
      ],
      [
        'a duplicate id',
        [
          { id: 'p1', role: 'other' },
          { id: 'p1', role: 'other' },
        ],
      ],
      ['a non-array', 'p1'],
    ])('rejects %s', (_, photos) => {
      expect(() => parseBackupDocument(withPhotos(photos))).toThrow(BackupError);
    });

    it('rejects a photo id used by two cards', () => {
      const photos = [{ id: 'p1', role: 'front' }];
      const json = documentWith({
        cards: [
          { ...aCard({ id: 'a' }), photos },
          { ...aCard({ id: 'b' }), photos },
        ],
      });

      expect(() => parseBackupDocument(json)).toThrow(BackupError);
    });
  });
});
