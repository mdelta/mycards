import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslocoTestingModule } from '@jsverse/transloco';

import en from '../../../../assets/i18n/en.json';
import { aCard } from '../../../../testing/card-builder';
import { InMemoryCardRepository } from '../../../../testing/in-memory-card-repository';
import { InMemoryPhotoStore } from '../../../../testing/in-memory-photo-store';
import type { BarcodeRenderer } from '../../../domain/ports/barcode-renderer';
import { BwipBarcodeRenderer } from '../../../infrastructure/barcode/bwip-barcode-renderer';
import {
  BARCODE_RENDERER,
  CARD_REPOSITORY,
  EXTERNAL_LAUNCHER,
  PHOTO_STORE,
  PRESENTATION_MODE,
  cardServiceProvider,
} from '../../../infrastructure/providers';

import { CardDetailPage } from './card-detail.page';

describe('CardDetailPage', () => {
  let repository: InMemoryCardRepository;
  let fixture: ComponentFixture<CardDetailPage>;
  const presentation = { enter: vi.fn(async () => undefined), exit: vi.fn(async () => undefined) };
  let launcherResult: boolean;
  const launcher = { open: vi.fn(async () => launcherResult) };
  const toast = { present: vi.fn() };
  const toasts = { create: vi.fn(async () => toast) };

  async function show(id: string, renderer: BarcodeRenderer = new BwipBarcodeRenderer()): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [
        CardDetailPage,
        TranslocoTestingModule.forRoot({
          langs: { en },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideRouter([]),
        { provide: CARD_REPOSITORY, useValue: repository },
        cardServiceProvider(),
        { provide: BARCODE_RENDERER, useValue: renderer },
        { provide: PRESENTATION_MODE, useValue: presentation },
        { provide: EXTERNAL_LAUNCHER, useValue: launcher },
        { provide: ToastController, useValue: toasts },
        {
          provide: PHOTO_STORE,
          useValue: new InMemoryPhotoStore({ f: new Uint8Array([1]), b: new Uint8Array([2]), i: new Uint8Array([3]) }),
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CardDetailPage);
    fixture.componentRef.setInput('id', id);
    await fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    launcherResult = true;
    repository = new InMemoryCardRepository([
      aCard({ id: 'ean', storeName: 'Bakery', cardId: '5901234123457', barcodeType: 'EAN_13' }),
      aCard({ id: 'plain', storeName: 'Pharmacy', cardId: '42', balance: 0, balanceType: 'points', note: 'Hi' }),
      aCard({ id: 'broken', cardId: 'abc', barcodeType: 'EAN_13' }),
    ]);
  });

  it('shows the barcode and card ID, brightens the screen and records the use', async () => {
    const element = await show('ean');

    const img = element.querySelector('img');
    expect(img?.getAttribute('alt')).toBe('Barcode of Bakery');
    expect(img?.getAttribute('src')).toMatch(/^data:image\/svg\+xml;charset=utf-8,%3Csvg/);
    expect(element.querySelector('[data-testid="card-id"]')?.textContent).toBe('5901234123457');
    expect(element.querySelector('ion-title')?.textContent).toContain('Bakery');
    expect(presentation.enter).toHaveBeenCalled();
    await vi.waitFor(async () => expect((await repository.findById('ean'))?.lastUsedAt).toBeDefined());
  });

  it('shows only the card ID and details when no barcode type is set', async () => {
    const element = await show('plain');

    expect(element.querySelector('img')).toBeNull();
    expect(element.textContent).toContain('No barcode type set');
    expect(element.textContent).toContain('0 points');
    expect(element.textContent).toContain('Hi');
  });

  it('explains when the barcode cannot be drawn', async () => {
    const element = await show('broken');

    expect(element.querySelector('img')).toBeNull();
    expect(element.textContent).toContain('This barcode cannot be displayed');
    expect(element.querySelector('[data-testid="card-id"]')?.textContent).toBe('abc');
  });

  it('shows a message for an unknown card', async () => {
    const element = await show('missing');

    expect(element.textContent).toContain('This card does not exist.');
    expect(element.querySelector('[data-testid="presentation"]')).toBeNull();
  });

  it('restores the screen when leaving', async () => {
    await show('ean');

    fixture.componentInstance.ionViewWillLeave();

    expect(presentation.exit).toHaveBeenCalled();
  });

  describe('tags and links', () => {
    beforeEach(async () => {
      await repository.saveAll(
        [
          aCard({
            id: 'linked',
            storeName: 'Bakery',
            tagIds: ['t1'],
            homepageUrl: 'https://bakery.example.com',
            shopSearchTerm: 'Bakery Berlin',
            websites: [{ label: 'Coupons', url: 'https://coupons.example.com' }],
          }),
        ],
        { tags: [{ id: 't1', name: 'Food' }] },
      );
    });

    it('shows the tags, the shop search, the homepage and the extra websites', async () => {
      const element = await show('linked');

      expect(element.textContent).toContain('Food');
      expect(element.querySelector('[data-testid="shop-search"]')).not.toBeNull();
      const sites = [...element.querySelectorAll('[data-testid="website"]')].map((item) => item.textContent);
      expect(sites).toHaveLength(2);
      expect(sites[0]).toContain('bakery.example.com');
      expect(sites[1]).toContain('Coupons');
    });

    it('opens a website externally', async () => {
      const element = await show('linked');

      (element.querySelectorAll('[data-testid="website"]')[1] as HTMLElement).click();
      await fixture.whenStable();

      expect(launcher.open).toHaveBeenCalledWith('https://coupons.example.com');
      expect(toasts.create).not.toHaveBeenCalled();
    });

    it('searches for the shop in the map app', async () => {
      const element = await show('linked');

      (element.querySelector('[data-testid="shop-search"]') as HTMLElement).click();
      await fixture.whenStable();

      expect(launcher.open).toHaveBeenCalledWith('geo:0,0?q=Bakery%20Berlin');
    });

    it('tells the user when no app can open a link', async () => {
      launcherResult = false;
      await show('linked');

      await fixture.componentInstance.openUrl('https://bakery.example.com');

      expect(toasts.create).toHaveBeenCalledWith(expect.objectContaining({ message: en.cardDetail.openFailed }));
      expect(toast.present).toHaveBeenCalled();
    });

    it('does not launch a stored homepage that is not a web URL', async () => {
      await show('linked');

      await fixture.componentInstance.openUrl('intent://scan#Intent;end');

      expect(launcher.open).not.toHaveBeenCalled();
      expect(toasts.create).toHaveBeenCalledWith(expect.objectContaining({ message: en.cardDetail.openFailed }));
    });

    it('hides the link section for a card without links', async () => {
      const element = await show('plain');

      expect(element.querySelectorAll('[data-testid="website"]')).toHaveLength(0);
      expect(element.querySelector('[data-testid="shop-search"]')).not.toBeNull();
    });
  });

  it('shows the photos below the details, but not the icon image', async () => {
    const photos = [
      { id: 'i', role: 'icon' as const },
      { id: 'f', role: 'front' as const },
      { id: 'b', role: 'back' as const },
    ];
    await repository.save(aCard({ id: 'photos', photos }));
    const element = await show('photos');
    for (let i = 0; i < 3; i++) {
      await fixture.whenStable();
      fixture.detectChanges();
    }

    const images = [...element.querySelectorAll('[data-testid="photo"]')];
    expect(images.map((img) => img.getAttribute('alt'))).toEqual(['Front of the card', 'Back of the card']);
    expect(images.map((img) => img.getAttribute('src'))).toEqual([
      'data:image/jpeg;base64,AQ==',
      'data:image/jpeg;base64,Ag==',
    ]);
  });
});
