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

  async function setUp(id?: string): Promise<void> {
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
      expect(fixture.nativeElement.querySelectorAll('ion-input.ion-invalid')).toHaveLength(2);
      expect(await repository.findAll()).toEqual([]);
      expect(nav.navigateBack).not.toHaveBeenCalled();
    });

    it('does nothing on delete', async () => {
      await page.confirmDelete();

      expect(alertController.create).not.toHaveBeenCalled();
    });
  });

  describe('existing card', () => {
    beforeEach(async () => {
      repository = new InMemoryCardRepository([
        aCard({ id: 'a', storeName: 'Store', balance: 3, barcodeType: 'EAN_13' }),
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
