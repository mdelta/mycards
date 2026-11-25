import type { Theme } from '../model/settings';

/** App settings, kept apart from card data and not part of exports (ADR-0019). */
export interface SettingsStore {
  theme(): Promise<Theme>;
  setTheme(theme: Theme): Promise<void>;
}
