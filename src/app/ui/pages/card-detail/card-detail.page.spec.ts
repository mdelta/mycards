import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';

import en from '../../../../assets/i18n/en.json';
import { aCard } from '../../../../testing/card-builder';
import { InMemoryCardRepository } from '../../../../testing/in-memory-card-repository';
import type { BarcodeRenderer } from '../../../domain/ports/barcode-renderer';
import { BwipBarcodeRenderer } from '../../../infrastructure/barcode/bwip-barcode-renderer';
import {
  BARCODE_RENDERER,
  CARD_REPOSITORY,
  PRESENTATION_MODE,
  cardServiceProvider,
} from '../../../infrastructure/providers';

import { CardDetailPage } from './card-detail.page';

describe('CardDetailPage', () => {
  let repository: InMemoryCardRepository;
  let fixture: ComponentFixture<CardDetailPage>;
  const presentation = { enter: vi.fn(async () => undefined), exit: vi.fn(async () => undefined) };

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
});
