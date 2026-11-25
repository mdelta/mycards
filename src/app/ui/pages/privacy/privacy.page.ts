import { NgTemplateOutlet } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonText,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { EXTERNAL_LAUNCHER } from '../../../infrastructure/providers';
import type { MarkdownBlock } from '../../simple-markdown';
import { parseMarkdown } from '../../simple-markdown';

/** The privacy policy; the same file is published on GitHub Pages (ADR-0019). */
@Component({
  selector: 'app-privacy',
  templateUrl: 'privacy.page.html',
  styleUrls: ['privacy.page.scss'],
  imports: [
    NgTemplateOutlet,
    IonBackButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonText,
    IonTitle,
    IonToolbar,
    TranslocoDirective,
  ],
})
export class PrivacyPage {
  private readonly launcher = inject(EXTERNAL_LAUNCHER);
  private readonly toasts = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  readonly blocks = signal<MarkdownBlock[]>([]);
  readonly failed = signal(false);

  constructor() {
    firstValueFrom(inject(HttpClient).get('assets/privacy.md', { responseType: 'text' })).then(
      (text) => this.blocks.set(parseMarkdown(text)),
      () => this.failed.set(true),
    );
  }

  async open(url: string): Promise<void> {
    if (!(await this.launcher.open(url))) {
      const message = this.transloco.translate('cardDetail.openFailed');
      await (await this.toasts.create({ message, duration: 4000 })).present();
    }
  }
}
