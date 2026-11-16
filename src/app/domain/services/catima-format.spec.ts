import { aCard } from '../../../testing/card-builder';
import { BackupError } from '../model/backup-error';

import { catimaLosses, fromCatima, parseCatimaCsv, toCatima } from './catima-format';

const HEADER =
  '_id,store,note,validfrom,expiry,balance,balancetype,cardid,barcodeid,barcodetype,barcodeencoding,headercolor,starstatus,lastused,archive';

/** Synthetic file following the observed format (docs/formats/catima-export.md). */
const SAMPLE = [
  '2',
  '',
  '_id',
  'Food',
  'food',
  '',
  HEADER,
  '1,Bakery,"note, with "" and\n\nline break",1794528000000,1795046400000,1.23,EUR,"4006381333931 ",,EAN_13,ISO-8859-1,-769226,1,1794696357,1',
  '2,Shop,,,,0,,abc,payload,MAXICODE,UTF-8,-416706,0,0,0',
  '3,Wrong check digit,,,,0,,4006381333932,,EAN_13,ISO-8859-1,-416706,0,1794696357,0',
  '',
  'cardId,groupId',
  '1,Food',
  '',
].join('\r\n');

describe('Catima format', () => {
  const now = '2026-11-16T12:00:00.000Z';
  let n: number;
  const newId = (): string => `id${++n}`;

  beforeEach(() => (n = 0));

  it('reads groups, cards and links', () => {
    const data = parseCatimaCsv(SAMPLE);

    expect(data.groups).toEqual(['Food', 'food']);
    expect(data.cards.map((card) => card._id)).toEqual(['1', '2', '3']);
    expect(data.cards[0].note).toBe('note, with " and\n\nline break');
    expect(data.links).toEqual([{ cardId: '1', groupId: 'Food' }]);
  });

  it('maps a card to a new MyCards card', () => {
    const { content } = fromCatima(parseCatimaCsv(SAMPLE), new Set(['card_1_front.png']), now, newId);

    expect(content.tags).toEqual([{ id: 'id1', name: 'Food' }]);
    expect(content.cards[0]).toEqual({
      id: 'id3',
      storeName: 'Bakery',
      cardId: '4006381333931',
      barcodeType: 'EAN_13',
      note: 'note, with " and\n\nline break',
      validFrom: '2026-11-13',
      expiry: '2026-11-19',
      balance: 1.23,
      balanceType: 'EUR',
      color: '#F44336',
      favorite: true,
      archived: true,
      showOnLockScreen: false,
      tagIds: ['id1'],
      websites: [],
      photos: [{ id: 'id2', role: 'front' }],
      createdAt: now,
      updatedAt: now,
      lastUsedAt: '2026-11-14T22:45:57.000Z',
    });
  });

  it('imports barcodes MyCards cannot show without barcode type and reports them', () => {
    const { content, unsupportedBarcodes } = fromCatima(parseCatimaCsv(SAMPLE), new Set(), now, newId);

    expect(content.cards[1]).toMatchObject({ storeName: 'Shop', cardId: 'abc', barcodeValue: 'payload' });
    expect(content.cards[1].barcodeType).toBeUndefined();
    expect(content.cards[1].balance).toBeUndefined();
    expect(content.cards[1].lastUsedAt).toBeUndefined();
    expect(content.cards[2].barcodeType).toBeUndefined();
    expect(unsupportedBarcodes).toEqual([
      { storeName: 'Shop', barcodeType: 'MAXICODE' },
      { storeName: 'Wrong check digit', barcodeType: 'EAN_13' },
    ]);
  });

  it.each([
    ['another version', SAMPLE.replace(/^2/, '3')],
    ['a missing section', SAMPLE.slice(0, SAMPLE.indexOf('cardId,groupId'))],
    ['an unknown card column', SAMPLE.replace(HEADER, HEADER.replace('archive', 'extra'))],
    ['a short card row', SAMPLE.replace('2,Shop,', 'Shop,')],
    ['a bad number', SAMPLE.replace('1.23', 'lots')],
    ['an empty store name', SAMPLE.replace('2,Shop,', '2,,')],
    ['a group row with two fields', SAMPLE.replace('Food\r\nfood', 'Food,x')],
    ['a link row with one field', SAMPLE.replace('1,Food', '1')],
  ])('rejects %s', (_, csv) => {
    expect(() => fromCatima(parseCatimaCsv(csv), new Set(), now, newId)).toThrow(BackupError);
  });

  it('round-trips cards and tags through a Catima export', () => {
    const card = aCard({
      storeName: 'Bäckerei, "Müller"',
      cardId: '4006381333931',
      barcodeType: 'EAN_13',
      note: 'line 1\nline 2',
      validFrom: '2026-01-01',
      expiry: '2027-01-01',
      balance: 2.5,
      balanceType: 'EUR',
      color: '#1565C0',
      favorite: true,
      archived: true,
      tagIds: ['t1'],
      photos: [
        { id: 'p1', role: 'icon' },
        { id: 'p2', role: 'other' },
      ],
      lastUsedAt: '2026-02-01T10:00:00.000Z',
    });
    const qr = aCard({
      id: 'c2',
      storeName: 'Kiosk',
      cardId: 'K1',
      barcodeValue: 'Grüße 東京',
      barcodeType: 'QR_CODE',
    });

    const { csv, photos } = toCatima([card, qr], [{ id: 't1', name: 'Food' }]);
    const { content } = fromCatima(parseCatimaCsv(csv), new Set(photos.map((p) => p.entry)), now, newId);

    expect(photos).toEqual([{ id: 'p1', entry: 'card_1_icon.png' }]);
    expect(csv).toContain(',QR_CODE,UTF-8,');
    expect(csv).toContain(`,EAN_13,ISO-8859-1,${0xff000000 | 0x1565c0},1,1769940000,1\r\n`);
    const { id: _id, photos: imported, tagIds, createdAt: _c, updatedAt: _u, ...fields } = content.cards[0];
    const { id: _i, photos: _p, tagIds: _t, createdAt: _cc, updatedAt: _uu, ...expected } = card;
    expect(fields).toEqual(expected);
    expect(imported.map((photo) => photo.role)).toEqual(['icon']);
    expect(tagIds).toEqual([content.tags[0].id]);
    expect(content.tags.map((tag) => tag.name)).toEqual(['Food']);
    expect(content.cards[1]).toMatchObject({ barcodeValue: 'Grüße 東京', barcodeType: 'QR_CODE' });
  });

  it('writes 0 for a missing balance and the update time without last use', () => {
    const { csv } = toCatima([aCard({ storeName: 'Store', updatedAt: '2026-01-01T00:00:00.000Z' })], []);
    const color = 0xff000000 | parseInt('37474F', 16);

    expect(csv.split('\r\n')[5]).toMatch(new RegExp(`^1,Store,,,,0,,123456,,,ISO-8859-1,-?\\d+,0,1767225600,0$`));
    expect(Number.isInteger(color)).toBe(true);
  });

  it('lists the fields a Catima export loses', () => {
    expect(catimaLosses([aCard()])).toEqual([]);
    expect(
      catimaLosses([
        aCard({ homepageUrl: 'https://a.de', icon: 'cafe' }),
        aCard({
          websites: [{ url: 'https://b.de' }],
          shopSearchTerm: 'x',
          showOnLockScreen: true,
          photos: [{ id: 'o', role: 'other' }],
        }),
      ]),
    ).toEqual(['homepage', 'websites', 'icon', 'shopSearchTerm', 'lockScreen', 'otherPhotos']);
  });
});
