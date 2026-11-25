import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonRadio,
  IonRadioGroup,
  IonRouterLink,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

import type { Theme } from '../../../domain/model/settings';
import { THEMES } from '../../../domain/model/settings';
import { APP_INFO, EXTERNAL_LAUNCHER } from '../../../infrastructure/providers';
import { ThemeService } from '../../theme.service';

export const SOURCE_CODE_URL = 'https://github.com/mdelta/mycards';

/** App settings, privacy notes, source code, licenses and version (R-4, ADR-0019). */
@Component({
  selector: 'app-settings',
  templateUrl: 'settings.page.html',
  imports: [
    RouterLink,
    IonRouterLink,
    IonBackButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonNote,
    IonRadio,
    IonRadioGroup,
    IonTitle,
    IonToolbar,
    TranslocoDirective,
  ],
})
export class SettingsPage {
  private readonly launcher = inject(EXTERNAL_LAUNCHER);
  private readonly toasts = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  readonly themes = THEMES;
  readonly themeService = inject(ThemeService);
  readonly version = signal<string | undefined>(undefined);

  constructor() {
    void inject(APP_INFO)
      .version()
      .then((version) => this.version.set(version));
  }

  onTheme(event: CustomEvent<{ value: Theme }>): void {
    void this.themeService.set(event.detail.value);
  }

  async openSourceCode(): Promise<void> {
    if (!(await this.launcher.open(SOURCE_CODE_URL))) {
      const message = this.transloco.translate('cardDetail.openFailed');
      await (await this.toasts.create({ message, duration: 4000 })).present();
    }
  }
}
