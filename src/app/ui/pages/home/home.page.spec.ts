import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslocoTestingModule } from '@jsverse/transloco';
import type { Mock } from 'vitest';

import en from '../../../../assets/i18n/en.json';
import { aCard } from '../../../../testing/card-builder';
import { InMemoryCardRepository } from '../../../../testing/in-memory-card-repository';
import type { BarcodeScanner } from '../../../domain/ports/barcode-scanner';
import { ScannerNotReadyError } from '../../../domain/ports/barcode-scanner';
import { BARCODE_SCANNER, CARD_REPOSITORY, cardServiceProvider } from '../../../infrastructure/providers';

import { HomePage } from './home.page';

describe('HomePage', () => {
  let fixture: ComponentFixture<HomePage>;
  let scanner: { available: boolean; scan: Mock<BarcodeScanner['scan']> };
  const toast = { present: vi.fn() };
  const toasts = { create: vi.fn(async () => toast) };

  beforeEach(() => {
    scanner = { available: false, scan: vi.fn<BarcodeScanner['scan']>() };
    vi.clearAllMocks();
  });

  async function render(repository: InMemoryCardRepository): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [
        HomePage,
        TranslocoTestingModule.forRoot({
          langs: { en },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        provideRouter([]),
        { provide: CARD_REPOSITORY, useValue: repository },
        cardServiceProvider(),
        { provide: BARCODE_SCANNER, useValue: scanner satisfies BarcodeScanner },
        { provide: ToastController, useValue: toasts },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HomePage);
    await fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const storeNames = (element: HTMLElement): string[] =>
    [...element.querySelectorAll('[data-testid="card-item"] h2')].map((h) => h.textContent ?? '');

  it('shows the empty state when there are no cards', async () => {
    const element = await render(new InMemoryCardRepository());

    expect(element.querySelector('#container')?.textContent).toContain('No cards yet.');
    expect(element.querySelector('ion-searchbar')).toBeNull();
  });

  it('lists cards favorites first, then by store name', async () => {
    const element = await render(
      new InMemoryCardRepository([
        aCard({ id: '1', storeName: 'Beta' }),
        aCard({ id: '2', storeName: 'alpha' }),
        aCard({ id: '3', storeName: 'Zeta', favorite: true }),
      ]),
    );

    expect(storeNames(element)).toEqual(['Zeta', 'alpha', 'Beta']);
    expect(element.querySelectorAll('ion-icon[name="star"]')).toHaveLength(1);
    expect(element.querySelector('#container')).toBeNull();
  });

  it('filters the list by the search query', async () => {
    const element = await render(
      new InMemoryCardRepository([aCard({ id: '1', storeName: 'Bakery' }), aCard({ id: '2', storeName: 'Pharmacy' })]),
    );

    fixture.componentInstance.onSearch(new CustomEvent('ionInput', { detail: { value: 'bak' } }));
    fixture.detectChanges();
    expect(storeNames(element)).toEqual(['Bakery']);

    fixture.componentInstance.onSearch(new CustomEvent('ionInput', { detail: { value: 'xyz' } }));
    fixture.detectChanges();
    expect(element.textContent).toContain('No cards match your search.');

    fixture.componentInstance.onSearch(new CustomEvent('ionInput', { detail: { value: null } }));
    fixture.detectChanges();
    expect(storeNames(element)).toHaveLength(2);
  });

  describe('scanning', () => {
    const scanButton = (element: HTMLElement): Element | null => element.querySelector('[aria-label="Scan card"]');

    it('hides the scan button where no scanner is available', async () => {
      expect(scanButton(await render(new InMemoryCardRepository()))).toBeNull();
    });

    it('opens the editor pre-filled with the scanned barcode', async () => {
      scanner.available = true;
      scanner.scan.mockResolvedValue({ type: 'EAN_13', value: '5901234123457' });
      const element = await render(new InMemoryCardRepository());
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      expect(scanButton(element)).not.toBeNull();
      await fixture.componentInstance.scan();

      expect(navigate).toHaveBeenCalledWith(['/cards/new'], {
        queryParams: { scannedType: 'EAN_13', scannedValue: '5901234123457' },
      });
    });

    it('stays on the list when the scan is cancelled', async () => {
      scanner.scan.mockResolvedValue(undefined);
      await render(new InMemoryCardRepository());
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');

      await fixture.componentInstance.scan();

      expect(navigate).not.toHaveBeenCalled();
      expect(toasts.create).not.toHaveBeenCalled();
    });

    it.each([
      [new ScannerNotReadyError(), 'The scanner is being downloaded. Try again in a moment.'],
      [new Error('boom'), 'Scanning failed. Try again or add the card manually.'],
    ])('shows a message when scanning fails (%s)', async (error, message) => {
      scanner.scan.mockRejectedValue(error);
      await render(new InMemoryCardRepository());

      await fixture.componentInstance.scan();

      expect(toasts.create).toHaveBeenCalledWith({ message, duration: 4000 });
      expect(toast.present).toHaveBeenCalled();
    });
  });
});
