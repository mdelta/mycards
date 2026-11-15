import { Component, inject, input, signal } from '@angular/core';
import type { SafeUrl } from '@angular/platform-browser';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import type { ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonText,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { addIcons } from 'ionicons';
import { createOutline, globeOutline, mapOutline, openOutline } from 'ionicons/icons';

import type { Card } from '../../../domain/model/card';
import { barcodeValueOf } from '../../../domain/services/barcode-value';
import { CardService } from '../../../domain/services/card-service';
import { openShopSearch } from '../../../domain/services/links';
import { BARCODE_RENDERER, EXTERNAL_LAUNCHER, PRESENTATION_MODE } from '../../../infrastructure/providers';

type BarcodeView = { kind: 'loading' } | { kind: 'none' } | { kind: 'error' } | { kind: 'image'; url: SafeUrl };

/**
 * Shows a card at the checkout (F-03, quality goal 1): large barcode, card ID, bright screen. Below
 * it: details, tags, websites and the shop search (F-06, F-07, ADR-0005).
 */
@Component({
  selector: 'app-card-detail',
  templateUrl: 'card-detail.page.html',
  styleUrl: 'card-detail.page.scss',
  imports: [
    IonBackButton,
    IonButton,
    IonButtons,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonText,
    IonTitle,
    IonToolbar,
    RouterLink,
    TranslocoDirective,
  ],
})
export class CardDetailPage implements ViewWillEnter, ViewWillLeave {
  private readonly cardService = inject(CardService);
  private readonly renderer = inject(BARCODE_RENDERER);
  private readonly presentation = inject(PRESENTATION_MODE);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly launcher = inject(EXTERNAL_LAUNCHER);
  private readonly toasts = inject(ToastController);
  private readonly transloco = inject(TranslocoService);

  /** Route parameter. */
  readonly id = input.required<string>();

  readonly card = signal<Card | undefined>(undefined);
  readonly loaded = signal(false);
  readonly barcode = signal<BarcodeView>({ kind: 'loading' });
  readonly tagNames = signal<string[]>([]);

  constructor() {
    addIcons({ createOutline, globeOutline, mapOutline, openOutline });
  }

  async ionViewWillEnter(): Promise<void> {
    void this.presentation.enter();
    const card = await this.cardService.get(this.id());
    this.card.set(card);
    this.loaded.set(true);
    if (card) {
      this.cardService.markUsed(card.id).catch(() => undefined);
      this.barcode.set(await this.render(card));
      const tags = await this.cardService.listTags();
      this.tagNames.set(tags.filter((tag) => card.tagIds.includes(tag.id)).map((tag) => tag.name));
    }
  }

  async openUrl(url: string): Promise<void> {
    await this.reportFailure(await this.launcher.open(url));
  }

  async findShop(card: Card): Promise<void> {
    await this.reportFailure(await openShopSearch(this.launcher, card));
  }

  private async reportFailure(opened: boolean): Promise<void> {
    if (!opened) {
      const message = this.transloco.translate('cardDetail.openFailed');
      await (await this.toasts.create({ message, duration: 4000 })).present();
    }
  }

  ionViewWillLeave(): void {
    void this.presentation.exit();
  }

  private async render(card: Card): Promise<BarcodeView> {
    if (!card.barcodeType) {
      return { kind: 'none' };
    }
    try {
      const svg = await this.renderer.toSvg(card.barcodeType, barcodeValueOf(card));
      // Safe: the SVG is generated locally by the renderer and contains only shapes, no text or scripts.
      const url = this.sanitizer.bypassSecurityTrustUrl(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
      return { kind: 'image', url };
    } catch {
      return { kind: 'error' };
    }
  }
}
