import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AlertController,
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
  IonToggle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

import type { Theme } from '../../../domain/model/settings';
import { THEMES } from '../../../domain/model/settings';
import type { TelemetryConsent } from '../../../domain/model/telemetry';
import { APP_INFO, EXTERNAL_LAUNCHER, LOCK_SCREEN, TELEMETRY } from '../../../infrastructure/providers';
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
    IonToggle,
    IonToolbar,
    TranslocoDirective,
  ],
})
export class SettingsPage {
  private readonly launcher = inject(EXTERNAL_LAUNCHER);
  private readonly toasts = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  private readonly alerts = inject(AlertController);
  readonly telemetry = inject(TELEMETRY);
  readonly lockScreen = inject(LOCK_SCREEN);
  readonly consent = signal<TelemetryConsent>({ crashReports: false, usageData: false });
  readonly themes = THEMES;
  readonly themeService = inject(ThemeService);
  readonly version = signal<string | undefined>(undefined);

  constructor() {
    void inject(APP_INFO)
      .version()
      .then((version) => this.version.set(version));
    if (this.telemetry.available) {
      void this.telemetry.consent().then((consent) => this.consent.set(consent));
    }
  }

  onTheme(event: CustomEvent<{ value: Theme }>): void {
    void this.themeService.set(event.detail.value);
  }

  /** Turning a switch on first shows which data is sent (ADR-0018). */
  async onConsent(key: keyof TelemetryConsent, event: CustomEvent<{ checked: boolean }>): Promise<void> {
    const checked = event.detail.checked;
    if (checked && !(await this.confirmConsent(key))) {
      (event.target as HTMLIonToggleElement).checked = false;
      return;
    }
    const consent = { ...this.consent(), [key]: checked };
    this.consent.set(consent);
    await this.telemetry.setConsent(consent);
  }

  private async confirmConsent(key: keyof TelemetryConsent): Promise<boolean> {
    const t = (k: string): string => this.transloco.translate(`settings.reports.${k}`);
    const alert = await this.alerts.create({
      header: t(`${key}Consent.header`),
      message: t(`${key}Consent.message`),
      cssClass: 'consent-alert',
      buttons: [
        { text: t('cancel'), role: 'cancel' },
        { text: t('turnOn'), role: 'confirm' },
      ],
    });
    await alert.present();
    return (await alert.onDidDismiss()).role === 'confirm';
  }

  /** Android's own prompt for adding the lock-screen tile (ADR-0006). */
  async addTile(): Promise<void> {
    const result = await this.lockScreen.requestAddTile();
    const message = this.transloco.translate(`settings.lockScreen.${result}`);
    await (await this.toasts.create({ message, duration: 3000 })).present();
  }

  async openSourceCode(): Promise<void> {
    if (!(await this.launcher.open(SOURCE_CODE_URL))) {
      const message = this.transloco.translate('cardDetail.openFailed');
      await (await this.toasts.create({ message, duration: 4000 })).present();
    }
  }
}
