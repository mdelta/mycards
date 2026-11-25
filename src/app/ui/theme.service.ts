import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

import type { Theme } from '../domain/model/settings';
import { SETTINGS_STORE } from '../infrastructure/providers';

const DARK_CLASS = 'ion-palette-dark';

/** Applies the chosen color theme with Ionic's `ion-palette-dark` class (R-4). */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly store = inject(SETTINGS_STORE);
  private readonly document = inject(DOCUMENT);
  private readonly systemDark = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');

  readonly theme = signal<Theme>('system');

  constructor() {
    this.systemDark?.addEventListener('change', () => this.apply());
  }

  async init(): Promise<void> {
    this.theme.set(await this.store.theme());
    this.apply();
  }

  async set(theme: Theme): Promise<void> {
    this.theme.set(theme);
    this.apply();
    await this.store.setTheme(theme);
  }

  private apply(): void {
    const theme = this.theme();
    const dark = theme === 'dark' || (theme === 'system' && !!this.systemDark?.matches);
    this.document.documentElement.classList.toggle(DARK_CLASS, dark);
  }
}
