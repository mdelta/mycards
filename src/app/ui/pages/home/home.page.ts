import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { ViewWillEnter } from '@ionic/angular';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonRouterLink,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { addIcons } from 'ionicons';
import { add, scanOutline, star } from 'ionicons/icons';

import type { Card } from '../../../domain/model/card';
import { ScannerNotReadyError } from '../../../domain/ports/barcode-scanner';
import { filterCards } from '../../../domain/services/card-filter';
import { CardService } from '../../../domain/services/card-service';
import { BARCODE_SCANNER } from '../../../infrastructure/providers';

/** Card list: favorites first, search (F-04, F-12); entry point for scanning a new card (F-02). */
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    IonButton,
    IonButtons,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonRouterLink,
    IonSearchbar,
    IonTitle,
    IonToolbar,
    RouterLink,
    TranslocoDirective,
  ],
})
export class HomePage implements ViewWillEnter {
  private readonly cardService = inject(CardService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  readonly scanner = inject(BARCODE_SCANNER);

  readonly cards = signal<Card[]>([]);
  readonly loaded = signal(false);
  readonly query = signal('');
  readonly visibleCards = computed(() => filterCards(this.cards(), this.query()));

  constructor() {
    addIcons({ add, scanOutline, star });
  }

  async ionViewWillEnter(): Promise<void> {
    this.cards.set(await this.cardService.list());
    this.loaded.set(true);
  }

  onSearch(event: CustomEvent<{ value?: string | null }>): void {
    this.query.set(event.detail.value ?? '');
  }

  /** Scans a barcode and opens the editor pre-filled with its type and value. */
  async scan(): Promise<void> {
    try {
      const barcode = await this.scanner.scan();
      if (barcode) {
        await this.router.navigate(['/cards/new'], {
          queryParams: { scannedType: barcode.type, scannedValue: barcode.value },
        });
      }
    } catch (error) {
      const key = error instanceof ScannerNotReadyError ? 'scannerNotReady' : 'scanFailed';
      const toast = await this.toasts.create({ message: this.transloco.translate(`cardList.${key}`), duration: 4000 });
      await toast.present();
    }
  }
}
