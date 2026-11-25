import type { PreferencesPlugin } from '@capacitor/preferences';

import type { Theme } from '../../domain/model/settings';
import { THEMES } from '../../domain/model/settings';
import type { SettingsStore } from '../../domain/ports/settings-store';

const THEME_KEY = 'theme';

/** Settings in Android's SharedPreferences (localStorage in the browser) via `@capacitor/preferences`. */
export class PreferencesSettingsStore implements SettingsStore {
  constructor(private readonly preferences: Pick<PreferencesPlugin, 'get' | 'set'>) {}

  async theme(): Promise<Theme> {
    const { value } = await this.preferences.get({ key: THEME_KEY });
    return THEMES.find((theme) => theme === value) ?? 'system';
  }

  async setTheme(theme: Theme): Promise<void> {
    await this.preferences.set({ key: THEME_KEY, value: theme });
  }
}
