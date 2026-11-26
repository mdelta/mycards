import { Component, inject, viewChild } from '@angular/core';
import { IonApp, IonRouterOutlet, Platform } from '@ionic/angular';

import { EXIT_APP, TELEMETRY } from './infrastructure/providers';
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
    inject(TELEMETRY)
      .init()
      .catch(() => undefined);
    const exitApp = inject(EXIT_APP);
    // Lowest priority: runs only when no page, overlay or menu handled Back.
    inject(Platform).backButton.subscribeWithPriority(-1, () => {
      if (!this.outlet().canGoBack()) {
        void exitApp();
      }
    });
  }
}
