import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslocoTestingModule } from '@jsverse/transloco';

import en from '../../../../assets/i18n/en.json';
import type { Theme } from '../../../domain/model/settings';
import { APP_INFO, EXTERNAL_LAUNCHER, SETTINGS_STORE } from '../../../infrastructure/providers';

import { SOURCE_CODE_URL, SettingsPage } from './settings.page';

describe('SettingsPage', () => {
  let fixture: ComponentFixture<SettingsPage>;
  let stored: Theme;
  let version: string | undefined;
  const launcher = { open: vi.fn(async () => true) };
  const toastController = { create: vi.fn(async () => ({ present: vi.fn() })) };

  async function create(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [
        SettingsPage,
        TranslocoTestingModule.forRoot({
          langs: { en },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        provideRouter([]),
        {
          provide: SETTINGS_STORE,
          useValue: { theme: async () => stored, setTheme: async (t: Theme) => (stored = t) },
        },
        { provide: APP_INFO, useValue: { version: async () => version } },
        { provide: EXTERNAL_LAUNCHER, useValue: launcher },
        { provide: ToastController, useValue: toastController },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const text = (): string => fixture.nativeElement.textContent;
  const versionNote = (): string =>
    fixture.nativeElement.querySelector('[data-testid="app-version"]').textContent.trim();

  beforeEach(() => {
    vi.clearAllMocks();
    stored = 'system';
    version = '1.0 (1)';
  });

  it('lists theme, privacy policy, source code, licenses and version', async () => {
    await create();

    for (const label of ['System default', 'Light', 'Dark', 'Privacy policy', 'Source code', 'Licenses']) {
      expect(text()).toContain(label);
    }
    expect(versionNote()).toBe('1.0 (1)');
  });

  it('says so when running in the browser', async () => {
    version = undefined;
    await create();

    expect(versionNote()).toBe('Browser version');
  });

  it('stores the chosen theme', async () => {
    await create();

    fixture.componentInstance.onTheme(new CustomEvent('ionChange', { detail: { value: 'dark' as Theme } }));
    await fixture.whenStable();

    expect(stored).toBe('dark');
    expect(fixture.componentInstance.themeService.theme()).toBe('dark');
    document.documentElement.classList.remove('ion-palette-dark');
  });

  it('opens the source code and reports when no app can open it', async () => {
    await create();

    await fixture.componentInstance.openSourceCode();
    expect(launcher.open).toHaveBeenCalledWith(SOURCE_CODE_URL);
    expect(toastController.create).not.toHaveBeenCalled();

    launcher.open.mockResolvedValueOnce(false);
    await fixture.componentInstance.openSourceCode();
    expect(toastController.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'No app found to open this link.' }),
    );
  });
});
