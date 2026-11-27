import { aCard } from '../../../testing/card-builder';
import { InMemoryCardRepository } from '../../../testing/in-memory-card-repository';
import type { BarcodeRenderer } from '../ports/barcode-renderer';
import type { LockScreen, LockScreenCard } from '../ports/lock-screen';

import { LockScreenService } from './lock-screen-service';

describe('LockScreenService', () => {
  let repository: InMemoryCardRepository;
  let written: (readonly LockScreenCard[])[];
  let lockScreen: LockScreen;
  const renderer: BarcodeRenderer = {
    toSvg: async () => '<svg/>',
    toPng: vi.fn(async (_type, value: string) => {
      if (value === 'bad') {
        throw new Error('invalid');
      }
      return new TextEncoder().encode(value);
    }),
  };
  let service: LockScreenService;

  beforeEach(() => {
    vi.clearAllMocks();
    written = [];
    repository = new InMemoryCardRepository();
    lockScreen = {
      available: true,
      replaceCards: vi.fn(async (cards) => {
        written.push(cards);
      }),
      requestAddTile: vi.fn(async () => 'added' as const),
    };
    service = new LockScreenService(lockScreen, () => repository, renderer);
  });

  it('writes marked, non-archived cards, favorites first, with barcode images', async () => {
    repository = new InMemoryCardRepository([
      aCard({ id: 'a', storeName: 'Beta', cardId: '1', showOnLockScreen: true, barcodeType: 'QR_CODE' }),
      aCard({ id: 'b', storeName: 'Alpha', cardId: '2', showOnLockScreen: true }),
      aCard({
        id: 'c',
        storeName: 'Zeta',
        cardId: '3',
        showOnLockScreen: true,
        favorite: true,
        barcodeType: 'CODE_128',
        barcodeValue: 'X3',
      }),
      aCard({ id: 'd', storeName: 'Gamma', showOnLockScreen: false, barcodeType: 'QR_CODE' }),
      aCard({ id: 'e', storeName: 'Delta', showOnLockScreen: true, archived: true, barcodeType: 'QR_CODE' }),
    ]);

    await service.sync();

    expect(written).toEqual([
      [
        { storeName: 'Zeta', cardId: '3', barcode: new TextEncoder().encode('X3') },
        { storeName: 'Alpha', cardId: '2' },
        { storeName: 'Beta', cardId: '1', barcode: new TextEncoder().encode('1') },
      ],
    ]);
  });

  it('keeps a card without image when its barcode cannot be drawn', async () => {
    repository = new InMemoryCardRepository([
      aCard({ storeName: 'Shop', cardId: 'bad', showOnLockScreen: true, barcodeType: 'QR_CODE' }),
    ]);

    await service.sync();

    expect(written).toEqual([[{ storeName: 'Shop', cardId: 'bad' }]]);
  });

  it('does nothing in the browser', async () => {
    lockScreen = { ...lockScreen, available: false };
    service = new LockScreenService(lockScreen, () => repository, renderer);

    await service.sync();

    expect(service.available).toBe(false);
    expect(lockScreen.replaceCards).not.toHaveBeenCalled();
  });

  it('merges calls during a running sync into one more sync with the latest cards', async () => {
    let release!: () => void;
    vi.mocked(lockScreen.replaceCards).mockImplementationOnce(
      (cards) =>
        new Promise<void>((resolve) => {
          written.push(cards);
          release = resolve;
        }),
    );
    const first = service.sync();
    await vi.waitFor(() => expect(written).toHaveLength(1));
    await repository.save(aCard({ storeName: 'New', showOnLockScreen: true }));
    const second = service.sync();
    const third = service.sync();
    release();
    await Promise.all([first, second, third]);

    expect(written).toEqual([[], [{ storeName: 'New', cardId: '123456' }]]);
  });

  it('runs the next sync after a failed one', async () => {
    vi.mocked(lockScreen.replaceCards).mockRejectedValueOnce(new Error('disk full'));

    await expect(service.sync()).rejects.toThrow('disk full');
    await service.sync();

    expect(lockScreen.replaceCards).toHaveBeenCalledTimes(2);
  });

  it('passes on the tile request', async () => {
    expect(await service.requestAddTile()).toBe('added');
  });
});
