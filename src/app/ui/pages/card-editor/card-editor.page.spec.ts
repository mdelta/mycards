import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AlertController, NavController } from '@ionic/angular';
import { TranslocoTestingModule } from '@jsverse/transloco';

import en from '../../../../assets/i18n/en.json';
import { aCard } from '../../../../testing/card-builder';
import { InMemoryCardRepository } from '../../../../testing/in-memory-card-repository';
import { CardService } from '../../../domain/services/card-service';
import { CARD_REPOSITORY, cardServiceProvider } from '../../../infrastructure/providers';

import { CardEditorPage } from './card-editor.page';

describe('CardEditorPage', () => {
  let repository: InMemoryCardRepository;
  let fixture: ComponentFixture<CardEditorPage>;
  let page: CardEditorPage;
  const nav = { navigateBack: vi.fn() };
  let dismissRole: string;
  const alertController = {
    create: vi.fn(async () => ({
      present: async () => undefined,
      onDidDismiss: async () => ({ role: dismissRole }),
    })),
  };

  async function setUp(id?: string, inputs: Record<string, string> = {}): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [
        CardEditorPage,
        TranslocoTestingModule.forRoot({
          langs: { en },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true,
        }),
      ],
      providers: [
        { provide: CARD_REPOSITORY, useValue: repository },
        cardServiceProvider(),
        { provide: NavController, useValue: nav },
        { provide: AlertController, useValue: alertController },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CardEditorPage);
    if (id) {
      fixture.componentRef.setInput('id', id);
    }
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    page = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(() => {
    repository = new InMemoryCardRepository();
    vi.clearAllMocks();
  });

  describe('new card', () => {
    beforeEach(() => setUp());

    it('creates a card from the form and navigates back to the list', async () => {
      expect(text()).toContain('New card');
      page.form.patchValue({
        storeName: 'Store',
        cardId: '123',
        barcodeType: 'QR_CODE',
        balance: '2.5',
        favorite: true,
      });

      await page.save();

      const [card] = await repository.findAll();
      expect(card).toMatchObject({
        storeName: 'Store',
        cardId: '123',
        barcodeType: 'QR_CODE',
        balance: 2.5,
        favorite: true,
      });
      expect(card.note).toBeUndefined();
      expect(nav.navigateBack).toHaveBeenCalledWith('/home');
    });

    it('shows validation errors and stays on the page', async () => {
      await page.save();
      fixture.detectChanges();

      expect(page.hasError('storeNameRequired')).toBe(true);
      expect(page.hasError('cardIdRequired')).toBe(true);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      expect(fixture.nativeElement.querySelectorAll('ion-input.ion-invalid.ion-touched')).toHaveLength(2);
      expect(await repository.findAll()).toEqual([]);
      expect(nav.navigateBack).not.toHaveBeenCalled();
    });

    it('marks the balance field invalid and clears errors that are fixed on the next save', async () => {
      page.form.patchValue({ storeName: 'Store', cardId: '1', balance: -1 });
      await page.save();
      fixture.detectChanges();

      expect(page.hasError('balanceInvalid')).toBe(true);
      expect(page.form.controls.balance.touched).toBe(true);
      expect(page.hasError('storeNameRequired')).toBe(false);

      page.form.controls.storeName.setValue('');
      await page.save();

      expect(page.hasError('storeNameRequired')).toBe(true);
      expect(page.hasError('balanceInvalid')).toBe(true);

      page.form.controls.balance.setValue(0);
      expect(page.hasError('balanceInvalid')).toBe(false);
    });

    it('does nothing on delete', async () => {
      await page.confirmDelete();

      expect(alertController.create).not.toHaveBeenCalled();
    });
  });

  describe('after a scan', () => {
    it('pre-fills barcode type and card ID', async () => {
      await setUp(undefined, { scannedType: 'EAN_13', scannedValue: '5901234123457' });

      expect(page.form.getRawValue()).toMatchObject({ barcodeType: 'EAN_13', cardId: '5901234123457', storeName: '' });
    });

    it('ignores unknown barcode types', async () => {
      await setUp(undefined, { scannedType: 'MAXICODE', scannedValue: 'x' });

      expect(page.form.getRawValue()).toMatchObject({ barcodeType: '', cardId: '' });
    });
  });

  describe('existing card', () => {
    beforeEach(async () => {
      repository = new InMemoryCardRepository([
        aCard({ id: 'a', storeName: 'Store', cardId: '5901234123457', balance: 3, barcodeType: 'EAN_13' }),
      ]);
      await setUp('a');
    });

    it('loads the card into the form and saves changes', async () => {
      expect(text()).toContain('Edit card');
      expect(page.form.getRawValue()).toMatchObject({
        storeName: 'Store',
        balance: 3,
        barcodeType: 'EAN_13',
        note: '',
      });

      page.form.patchValue({ storeName: 'Renamed', balance: '' });
      await page.save();

      expect(await repository.findById('a')).toMatchObject({ storeName: 'Renamed', barcodeType: 'EAN_13' });
      expect((await repository.findById('a'))?.balance).toBeUndefined();
      expect(nav.navigateBack).toHaveBeenCalledWith(['/cards', 'a']);
    });

    it('shows an invalid barcode value on the field that holds it', async () => {
      page.form.patchValue({ cardId: 'abc' });
      await page.save();
      expect(page.form.controls.cardId.hasError('barcodeValueInvalid')).toBe(true);

      page.form.patchValue({ barcodeValue: 'xyz' });
      await page.save();
      expect(page.form.controls.barcodeValue.hasError('barcodeValueInvalid')).toBe(true);
      expect(page.form.controls.cardId.hasError('barcodeValueInvalid')).toBe(false);
      expect(page.hasError('barcodeValueInvalid')).toBe(true);
      expect(nav.navigateBack).not.toHaveBeenCalled();
    });

    it('clears barcode value errors when the barcode type changes', async () => {
      page.form.patchValue({ cardId: 'abc', storeName: '' });
      await page.save();
      expect(page.form.controls.cardId.errors).toEqual({ barcodeValueInvalid: true });
      expect(page.form.controls.storeName.hasError('storeNameRequired')).toBe(true);

      page.form.patchValue({ barcodeType: 'CODE_128' });

      expect(page.form.controls.cardId.errors).toBeNull();
      expect(page.form.controls.storeName.hasError('storeNameRequired')).toBe(true);
    });

    it('deletes the card after confirmation', async () => {
      dismissRole = 'destructive';

      await page.confirmDelete();

      expect(alertController.create).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Delete card?', message: '"Store" will be deleted permanently.' }),
      );
      expect(await repository.findAll()).toEqual([]);
      expect(nav.navigateBack).toHaveBeenCalledWith('/home');
    });

    it('keeps the card when deletion is cancelled', async () => {
      dismissRole = 'cancel';

      await page.confirmDelete();

      expect(await repository.findAll()).toHaveLength(1);
      expect(nav.navigateBack).not.toHaveBeenCalled();
    });
  });

  it('shows a message for an unknown card', async () => {
    await setUp('missing');
    fixture.detectChanges();

    expect(page.notFound()).toBe(true);
    expect(text()).toContain('This card does not exist.');
  });

  it('rethrows unexpected errors', async () => {
    await setUp();
    vi.spyOn(TestBed.inject(CardService), 'create').mockRejectedValue(new Error('disk full'));
    page.form.patchValue({ storeName: 'S', cardId: '1' });

    await expect(page.save()).rejects.toThrow('disk full');
  });
});
