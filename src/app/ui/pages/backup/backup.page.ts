import { Component, inject, signal } from '@angular/core';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonInputPasswordToggle,
  IonItem,
  IonList,
  IonListHeader,
  IonNote,
  IonRadio,
  IonRadioGroup,
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

import { BackupError } from '../../../domain/model/backup-error';
import type { BackupContent } from '../../../domain/services/backup-document';
import type { BackupFormat } from '../../../domain/services/backup-service';
import { BackupService } from '../../../domain/services/backup-service';
import { CardService } from '../../../domain/services/card-service';
import type { CatimaLoss } from '../../../domain/services/catima-format';
import { BACKUP_FILES, TELEMETRY } from '../../../infrastructure/providers';

/** Export and import in the own format and the Catima format (F-05, F-11, ADR-0004). */
@Component({
  selector: 'app-backup',
  templateUrl: 'backup.page.html',
  imports: [
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonInput,
    IonInputPasswordToggle,
    IonItem,
    IonList,
    IonListHeader,
    IonNote,
    IonRadio,
    IonRadioGroup,
    IonText,
    IonTitle,
    IonToggle,
    IonToolbar,
    TranslocoDirective,
  ],
})
export class BackupPage {
  private readonly backup = inject(BackupService);
  private readonly cardService = inject(CardService);
  private readonly files = inject(BACKUP_FILES);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  private readonly telemetry = inject(TELEMETRY);

  readonly password = signal('');
  readonly passwordRepeat = signal('');
  readonly passwordMismatch = signal(false);
  readonly clean = signal(false);
  readonly format = signal<BackupFormat>('mycards');
  readonly busy = signal(false);

  onPassword(event: CustomEvent<{ value?: string | null }>, repeat: boolean): void {
    const value = event.detail.value ?? '';
    (repeat ? this.passwordRepeat : this.password).set(value);
    if (!repeat && !value) {
      this.passwordRepeat.set('');
    }
    this.passwordMismatch.set(false);
  }

  onFormat(event: CustomEvent<{ value: BackupFormat }>): void {
    this.format.set(event.detail.value);
  }

  onClean(event: CustomEvent<{ checked: boolean }>): void {
    this.clean.set(event.detail.checked);
  }

  async exportCards(): Promise<void> {
    if (this.password() !== this.passwordRepeat()) {
      this.passwordMismatch.set(true);
      return;
    }
    await this.run(async () => {
      try {
        if (this.format() === 'catima' && !(await this.acceptLosses(await this.backup.catimaLosses()))) {
          return;
        }
        await this.files.share(await this.backup.createBackup(this.password(), this.format()));
        this.password.set('');
        this.passwordRepeat.set('');
        void this.telemetry.count(this.format() === 'catima' ? 'exportCatima' : 'exportMyCards');
        await this.toast('export.done');
      } catch {
        await this.toast('export.failed');
      }
    });
  }

  async importCards(): Promise<void> {
    await this.run(async () => {
      try {
        const file = await this.files.pick();
        const content = file && (await this.readWithPassword(file.data));
        if (content && (await this.confirmImport(content))) {
          await this.backup.restoreBackup(content, { clean: this.clean() });
          void this.telemetry.count(content.format === 'catima' ? 'importCatima' : 'importMyCards');
          await this.toast('import.done', { count: content.cards.length });
          if (content.unsupportedBarcodes?.length) {
            await this.inform(
              'import.unsupportedHeader',
              this.t('import.unsupportedMessage', {
                cards: content.unsupportedBarcodes.map((u) => `${u.storeName} (${u.barcodeType})`).join(', '),
              }),
            );
          }
        }
      } catch (error) {
        await this.toast(error instanceof BackupError ? `errors.${error.reason}` : 'errors.importFailed');
      }
    });
  }

  /** Asks for the password until it is right; `undefined` if the user cancels. */
  private async readWithPassword(data: Uint8Array): Promise<BackupContent | undefined> {
    let password: string | undefined;
    for (;;) {
      try {
        return await this.backup.readBackup(data, password);
      } catch (error) {
        if (!(error instanceof BackupError) || !['passwordRequired', 'wrongPassword'].includes(error.reason)) {
          throw error;
        }
        password = await this.askPassword(error.reason === 'wrongPassword');
        if (password === undefined) {
          return undefined;
        }
      }
    }
  }

  private async askPassword(wrong: boolean): Promise<string | undefined> {
    const alert = await this.alerts.create({
      header: this.t('import.passwordHeader'),
      message: this.t(wrong ? 'import.wrongPasswordMessage' : 'import.passwordMessage'),
      inputs: [{ name: 'password', type: 'password', placeholder: this.t('import.passwordPlaceholder') }],
      buttons: [
        { text: this.t('import.cancel'), role: 'cancel' },
        { text: this.t('import.ok'), role: 'confirm' },
      ],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss<{ values: { password: string } }>();
    return role === 'confirm' ? (data?.values.password ?? '') : undefined;
  }

  /** Asks before a Catima export drops fields Catima has no place for. */
  private async acceptLosses(losses: CatimaLoss[]): Promise<boolean> {
    if (!losses.length) {
      return true;
    }
    const fields = losses.map((loss) => this.t(`export.losses.${loss}`)).join(', ');
    const alert = await this.alerts.create({
      header: this.t('export.lossHeader'),
      message: this.t('export.lossMessage', { fields }),
      buttons: [
        { text: this.t('import.cancel'), role: 'cancel' },
        { text: this.t('export.button'), role: 'confirm' },
      ],
    });
    await alert.present();
    return (await alert.onDidDismiss()).role === 'confirm';
  }

  private async inform(header: string, message: string): Promise<void> {
    const alert = await this.alerts.create({ header: this.t(header), message, buttons: [this.t('import.ok')] });
    await alert.present();
    await alert.onDidDismiss();
  }

  private async confirmImport(content: BackupContent): Promise<boolean> {
    const cards = content.cards;
    const message = this.clean()
      ? this.t('import.confirmCleanMessage', { existing: (await this.cardService.list()).length })
      : this.t(content.format === 'catima' ? 'import.confirmCatimaMessage' : 'import.confirmMessage');
    const alert = await this.alerts.create({
      header: this.t('import.confirmHeader', { count: cards.length }),
      message,
      buttons: [
        { text: this.t('import.cancel'), role: 'cancel' },
        { text: this.t('import.confirm'), role: 'confirm' },
      ],
    });
    await alert.present();
    return (await alert.onDidDismiss()).role === 'confirm';
  }

  private async run(work: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await work();
    } finally {
      this.busy.set(false);
    }
  }

  private async toast(key: string, params?: Record<string, unknown>): Promise<void> {
    const toast = await this.toasts.create({ message: this.t(key, params), duration: 4000 });
    await toast.present();
  }

  private t(key: string, params?: Record<string, unknown>): string {
    return this.transloco.translate(`backup.${key}`, params);
  }
}
