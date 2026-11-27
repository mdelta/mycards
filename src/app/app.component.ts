import { Component, inject, viewChild } from '@angular/core';
import { IonApp, IonRouterOutlet, Platform } from '@ionic/angular';

import { EXIT_APP, LOCK_SCREEN, TELEMETRY } from './infrastructure/providers';
import { ThemeService } from './ui/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private readonly outlet = viewChild.required(IonRouterOutlet);

  constructor() {
    void inject(ThemeService).init();
    const telemetry = inject(TELEMETRY);
    telemetry.init().catch(() => undefined);
    // Writes the lock-screen cards, e.g. after an app update or a restore from Android backup.
    inject(LOCK_SCREEN)
      .sync()
      .catch(() => undefined);
    const platform = inject(Platform);
    // The app may stay in memory for weeks; check the weekly usage summary when it comes back.
    platform.resume.subscribe(() => {
      telemetry.sendUsageIfDue().catch(() => undefined);
    });
    const exitApp = inject(EXIT_APP);
    // Lowest priority: runs only when no page, overlay or menu handled Back.
    platform.backButton.subscribeWithPriority(-1, () => {
      if (!this.outlet().canGoBack()) {
        void exitApp();
      }
    });
  }
}
