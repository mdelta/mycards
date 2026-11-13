import type { KeepAwakePlugin } from '@capacitor-community/keep-awake';
import type { ScreenBrightnessPlugin } from '@capacitor-community/screen-brightness';

import type { PresentationMode } from '../../domain/ports/presentation-mode';

/** Android restores the user's brightness for the window when set to -1. */
const USER_BRIGHTNESS = -1;

/**
 * `PresentationMode` with the Capacitor brightness and keep-awake plugins. Both only affect the
 * app's own window. Failures (e.g. no web implementation) are ignored so they never delay or
 * block showing the barcode.
 */
export class CapacitorPresentationMode implements PresentationMode {
  constructor(
    private readonly brightness: Pick<ScreenBrightnessPlugin, 'setBrightness'>,
    private readonly keepAwake: Pick<KeepAwakePlugin, 'keepAwake' | 'allowSleep'>,
  ) {}

  async enter(): Promise<void> {
    await Promise.allSettled([this.brightness.setBrightness({ brightness: 1 }), this.keepAwake.keepAwake()]);
  }

  async exit(): Promise<void> {
    await Promise.allSettled([
      this.brightness.setBrightness({ brightness: USER_BRIGHTNESS }),
      this.keepAwake.allowSleep(),
    ]);
  }
}
