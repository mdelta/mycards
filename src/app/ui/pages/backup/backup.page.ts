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
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

import { BackupError } from '../../../domain/model/backup-error';
import type { Card } from '../../../domain/model/card';
import type { BackupContent } from '../../../domain/services/backup-document';
import { BackupService } from '../../../domain/services/backup-service';
import { CardService } from '../../../domain/services/card-service';
import { BACKUP_FILES } from '../../../infrastructure/providers';

/** Export and import in the own format (F-05, F-11, ADR-0004). */
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

  readonly password = signal('');
  readonly passwordRepeat = signal('');
  readonly passwordMismatch = signal(false);
  readonly clean = signal(false);
  readonly busy = signal(false);

  onPassword(event: CustomEvent<{ value?: string | null }>, repeat: boolean): void {
    const value = event.detail.value ?? '';
    (repeat ? this.passwordRepeat : this.password).set(value);
    if (!repeat && !value) {
      this.passwordRepeat.set('');
    }
    this.passwordMismatch.set(false);
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
        await this.files.share(await this.backup.createBackup(this.password()));
        this.password.set('');
        this.passwordRepeat.set('');
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
        if (content && (await this.confirmImport(content.cards))) {
          await this.backup.restoreBackup(content, { clean: this.clean() });
          await this.toast('import.done', { count: content.cards.length });
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

  private async confirmImport(cards: Card[]): Promise<boolean> {
    const message = this.clean()
      ? this.t('import.confirmCleanMessage', { existing: (await this.cardService.list()).length })
      : this.t('import.confirmMessage');
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
