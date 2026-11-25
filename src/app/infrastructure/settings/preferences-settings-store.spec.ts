import { PreferencesSettingsStore } from './preferences-settings-store';

describe('PreferencesSettingsStore', () => {
  const values = new Map<string, string>();
  const preferences = {
    get: async ({ key }: { key: string }) => ({ value: values.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => {
      values.set(key, value);
    },
  };
  const store = new PreferencesSettingsStore(preferences);

  beforeEach(() => values.clear());

  it('defaults to the system theme', async () => {
    expect(await store.theme()).toBe('system');
  });

  it('keeps the chosen theme', async () => {
    await store.setTheme('dark');

    expect(await store.theme()).toBe('dark');
  });

  it('ignores an unknown stored value', async () => {
    values.set('theme', 'purple');

    expect(await store.theme()).toBe('system');
  });
});
