import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';

import en from '../../../../assets/i18n/en.json';
import { aCard } from '../../../../testing/card-builder';
import { InMemoryCardRepository } from '../../../../testing/in-memory-card-repository';
import { CARD_REPOSITORY, cardServiceProvider } from '../../../infrastructure/providers';

import { HomePage } from './home.page';

describe('HomePage', () => {
  let fixture: ComponentFixture<HomePage>;

  async function render(repository: InMemoryCardRepository): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [
        HomePage,
        TranslocoTestingModule.forRoot({
          langs: { en },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [provideRouter([]), { provide: CARD_REPOSITORY, useValue: repository }, cardServiceProvider()],
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
});
