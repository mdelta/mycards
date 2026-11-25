import { TestBed } from '@angular/core/testing';

import type { Theme } from '../domain/model/settings';
import { SETTINGS_STORE } from '../infrastructure/providers';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let stored: Theme;
  let systemDark: boolean;
  let onSystemChange: () => void;
  const root = () => document.documentElement.classList;

  beforeEach(() => {
    stored = 'system';
    systemDark = false;
    window.matchMedia = vi.fn(
      () =>
        ({
          get matches() {
            return systemDark;
          },
          addEventListener: (_: string, listener: () => void) => (onSystemChange = listener),
        }) as unknown as MediaQueryList,
    );
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SETTINGS_STORE,
          useValue: { theme: async () => stored, setTheme: async (theme: Theme) => (stored = theme) },
        },
      ],
    });
  });

  afterEach(() => root().remove('ion-palette-dark'));

  it('follows the system setting by default', async () => {
    systemDark = true;
    await TestBed.inject(ThemeService).init();
    expect(root()).toContain('ion-palette-dark');

    systemDark = false;
    onSystemChange();
    expect(root()).not.toContain('ion-palette-dark');
  });

  it('applies the stored theme regardless of the system setting', async () => {
    stored = 'dark';
    const service = TestBed.inject(ThemeService);
    await service.init();

    expect(service.theme()).toBe('dark');
    expect(root()).toContain('ion-palette-dark');
  });

  it('stores and applies a newly chosen theme', async () => {
    systemDark = true;
    const service = TestBed.inject(ThemeService);
    await service.init();

    await service.set('light');

    expect(stored).toBe('light');
    expect(root()).not.toContain('ion-palette-dark');
  });
});
