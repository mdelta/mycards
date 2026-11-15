import type { AppLauncherPlugin } from '@capacitor/app-launcher';

import type { ExternalLauncher } from '../../domain/ports/external-launcher';

/** Opens URLs with Android intents via `@capacitor/app-launcher` (ADR-0005): browser, map app. */
export class CapacitorExternalLauncher implements ExternalLauncher {
  constructor(private readonly plugin: Pick<AppLauncherPlugin, 'openUrl'>) {}

  async open(url: string): Promise<boolean> {
    try {
      return (await this.plugin.openUrl({ url })).completed;
    } catch {
      return false;
    }
  }
}
