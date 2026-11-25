import type { AppPlugin } from '@capacitor/app';

import type { AppInfo } from '../../domain/ports/app-info';

/** Version of the installed Android app via `@capacitor/app`. */
export class CapacitorAppInfo implements AppInfo {
  constructor(
    private readonly app: Pick<AppPlugin, 'getInfo'>,
    private readonly native: boolean,
  ) {}

  async version(): Promise<string | undefined> {
    if (!this.native) {
      return undefined;
    }
    const { version, build } = await this.app.getInfo();
    return `${version} (${build})`;
  }
}
