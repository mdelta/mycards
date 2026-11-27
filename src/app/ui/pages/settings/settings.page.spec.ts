import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { TranslocoTestingModule } from '@jsverse/transloco';

import en from '../../../../assets/i18n/en.json';
import type { Theme } from '../../../domain/model/settings';
import type { TelemetryConsent } from '../../../domain/model/telemetry';
import { APP_INFO, EXTERNAL_LAUNCHER, LOCK_SCREEN, SETTINGS_STORE, TELEMETRY } from '../../../infrastructure/providers';

import { SOURCE_CODE_URL, SettingsPage } from './settings.page';

describe('SettingsPage', () => {
  let fixture: ComponentFixture<SettingsPage>;
  let stored: Theme;
  let version: string | undefined;
  const launcher = { open: vi.fn(async () => true) };
  const toastController = { create: vi.fn(async () => ({ present: vi.fn() })) };
  let alertRole: string;
  const alertController = {
    create: vi.fn(async () => ({ present: vi.fn(), onDidDismiss: async () => ({ role: alertRole }) })),
  };
  let telemetry: {
    available: boolean;
    consent: () => Promise<TelemetryConsent>;
    setConsent: ReturnType<typeof vi.fn>;
  };
  let lockScreen: { available: boolean; requestAddTile: ReturnType<typeof vi.fn> };

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
        { provide: AlertController, useValue: alertController },
        { provide: TELEMETRY, useValue: telemetry },
        { provide: LOCK_SCREEN, useValue: lockScreen },
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
    alertRole = 'confirm';
    telemetry = {
      available: false,
      consent: async () => ({ crashReports: false, usageData: true }),
      setConsent: vi.fn(async () => undefined),
    };
    lockScreen = { available: false, requestAddTile: vi.fn(async () => 'added') };
  });

  const toggleEvent = (checked: boolean): CustomEvent<{ checked: boolean }> => {
    const event = new CustomEvent('ionChange', { detail: { checked } });
    Object.defineProperty(event, 'target', { value: { checked } });
    return event;
  };

  it('hides the report switches in builds without a DSN', async () => {
    await create();

    expect(text()).not.toContain('Send crash reports');
    expect(text()).not.toContain('Sent data');
  });

  it('shows the report switches with the stored consent', async () => {
    telemetry.available = true;
    await create();

    expect(text()).toContain('Send crash reports');
    expect(text()).toContain('Send usage data');
    expect(text()).toContain('Sent data');
    const toggles = fixture.nativeElement.querySelectorAll('ion-toggle');
    expect([...toggles].map((t: HTMLIonToggleElement) => t.checked)).toEqual([false, true]);
  });

  it('turns a switch on only after the user confirms the listed data', async () => {
    telemetry.available = true;
    await create();

    await fixture.componentInstance.onConsent('crashReports', toggleEvent(true));

    expect(alertController.create).toHaveBeenCalledWith(
      expect.objectContaining({
        header: 'Send crash reports?',
        message: expect.stringContaining('No card content and no IP address are sent.'),
      }),
    );
    expect(telemetry.setConsent).toHaveBeenCalledWith({ crashReports: true, usageData: true });
  });

  it('leaves a switch off when the user cancels', async () => {
    telemetry.available = true;
    alertRole = 'cancel';
    await create();
    const event = toggleEvent(true);

    await fixture.componentInstance.onConsent('crashReports', event);

    expect((event.target as HTMLIonToggleElement).checked).toBe(false);
    expect(telemetry.setConsent).not.toHaveBeenCalled();
  });

  it('turns a switch off without asking', async () => {
    telemetry.available = true;
    await create();

    await fixture.componentInstance.onConsent('usageData', toggleEvent(false));

    expect(alertController.create).not.toHaveBeenCalled();
    expect(telemetry.setConsent).toHaveBeenCalledWith({ crashReports: false, usageData: false });
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

  it('hides the lock-screen tile button in the browser', async () => {
    await create();

    expect(fixture.nativeElement.querySelector('[data-testid="add-tile"]')).toBeNull();
  });

  it.each([
    ['added', 'Tile added to Quick Settings.'],
    ['alreadyAdded', 'The tile is already in Quick Settings.'],
    ['notAdded', 'Tile not added.'],
    ['failed', "Couldn't add the tile. Add it in Android's Quick Settings editor."],
  ])('asks Android to add the lock-screen tile and reports %s', async (result, message) => {
    lockScreen.available = true;
    lockScreen.requestAddTile.mockResolvedValue(result);
    await create();

    fixture.nativeElement.querySelector('[data-testid="add-tile"]').click();
    await fixture.whenStable();

    expect(lockScreen.requestAddTile).toHaveBeenCalled();
    expect(toastController.create).toHaveBeenCalledWith(expect.objectContaining({ message }));
  });
});
