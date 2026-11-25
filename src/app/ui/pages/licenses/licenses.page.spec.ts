import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';

import en from '../../../../assets/i18n/en.json';
import { EXTERNAL_LAUNCHER } from '../../../infrastructure/providers';

import { APP_LICENSE_URL, LicensesPage } from './licenses.page';

describe('LicensesPage', () => {
  let fixture: ComponentFixture<LicensesPage>;
  let http: HttpTestingController;
  const launcher = { open: vi.fn(async () => true) };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [
        LicensesPage,
        TranslocoTestingModule.forRoot({
          langs: { en },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: EXTERNAL_LAUNCHER, useValue: launcher }],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LicensesPage);
    fixture.detectChanges();
  });

  async function settle(): Promise<HTMLElement> {
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('lists the Android and JavaScript libraries with their licenses', async () => {
    http.expectOne('assets/licenses/android-libraries.json').flush({
      libraries: [{ uniqueId: 'androidx.core:core', artifactVersion: '1.17.0', licenses: ['Apache-2.0'] }],
      licenses: { 'Apache-2.0': { spdxId: 'Apache-2.0', content: 'Apache text' } },
    });
    http.expectOne('3rdpartylicenses.txt').flush('-'.repeat(80) + '\nPackage: rxjs\nLicense: "Apache-2.0"\n\nText\n');
    const element = await settle();

    expect(element.querySelector('[data-testid="android"]')?.textContent).toContain('androidx.core:core');
    expect(element.querySelector('[data-testid="android"]')?.textContent).toContain('1.17.0 · Apache-2.0');
    expect(element.querySelector('[data-testid="web"]')?.textContent).toContain('rxjs');
    expect(element.textContent).toContain('MyCards');
  });

  it('says so when a list is not part of the build', async () => {
    http.expectOne('assets/licenses/android-libraries.json').flush('', { status: 404, statusText: 'Not Found' });
    http.expectOne('3rdpartylicenses.txt').flush('', { status: 404, statusText: 'Not Found' });
    const element = await settle();

    expect(element.querySelectorAll('ion-note').length).toBe(2);
    expect(element.textContent).toContain('Not included in this build.');
  });

  it('opens license links in the browser', () => {
    fixture.componentInstance.open(APP_LICENSE_URL);

    expect(launcher.open).toHaveBeenCalledWith('https://github.com/mdelta/mycards/blob/main/LICENSE');
  });
});
