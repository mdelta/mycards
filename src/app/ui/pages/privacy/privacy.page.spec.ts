import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ToastController } from '@ionic/angular';
import { TranslocoTestingModule } from '@jsverse/transloco';

import en from '../../../../assets/i18n/en.json';
import { EXTERNAL_LAUNCHER } from '../../../infrastructure/providers';

import { PrivacyPage } from './privacy.page';

describe('PrivacyPage', () => {
  let fixture: ComponentFixture<PrivacyPage>;
  let http: HttpTestingController;
  const launcher = { open: vi.fn(async () => true) };
  const toastController = { create: vi.fn(async () => ({ present: vi.fn() })) };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [
        PrivacyPage,
        TranslocoTestingModule.forRoot({
          langs: { en },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EXTERNAL_LAUNCHER, useValue: launcher },
        { provide: ToastController, useValue: toastController },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PrivacyPage);
    fixture.detectChanges();
  });

  async function respond(body: string | null): Promise<HTMLElement> {
    const request = http.expectOne('assets/privacy.md');
    if (body === null) {
      request.flush('', { status: 404, statusText: 'Not Found' });
    } else {
      request.flush(body);
    }
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('shows the policy from docs/privacy.md', async () => {
    const element = await respond(
      '# Policy\n\n## Data\n\nStays on [your phone](https://example.org).\n\n### Detail\n\n- one\n- two',
    );

    expect(element.querySelector('h1')?.textContent).toBe('Policy');
    expect(element.querySelector('h2')?.textContent).toBe('Data');
    expect(element.querySelector('h3')?.textContent).toBe('Detail');
    expect([...element.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['one', 'two']);
    expect(element.querySelector('p')?.textContent).toContain('Stays on your phone.');
  });

  it('opens links in other apps and reports when that fails', async () => {
    const element = await respond('Mail <mailto:privacy@example.org>');

    element.querySelector('a')!.click();
    await fixture.whenStable();
    expect(launcher.open).toHaveBeenCalledWith('mailto:privacy@example.org');
    expect(toastController.create).not.toHaveBeenCalled();

    launcher.open.mockResolvedValueOnce(false);
    await fixture.componentInstance.open('https://example.org');
    expect(toastController.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'No app found to open this link.' }),
    );
  });

  it('says so when the policy cannot be loaded', async () => {
    const element = await respond(null);

    expect(element.textContent).toContain('The privacy policy could not be loaded.');
  });
});
