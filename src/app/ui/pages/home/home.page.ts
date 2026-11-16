import { AsyncPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { ViewWillEnter } from '@ionic/angular';
import {
  IonButton,
  IonButtons,
  IonChip,
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
import { add, scanOutline, star, swapVerticalOutline } from 'ionicons/icons';

import type { Card, Tag } from '../../../domain/model/card';
import { photoOf } from '../../../domain/model/photo';
import { ScannerNotReadyError } from '../../../domain/ports/barcode-scanner';
import { filterCards } from '../../../domain/services/card-filter';
import { CardService } from '../../../domain/services/card-service';
import { BARCODE_SCANNER } from '../../../infrastructure/providers';
import { CardAvatarComponent } from '../../components/card-avatar/card-avatar.component';
import { PhotoUrlPipe } from '../../photo-url.pipe';

/** Card list: favorites first, search, tag filter (F-04, F-07, F-12); entry point for scanning (F-02). */
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    AsyncPipe,
    PhotoUrlPipe,
    IonButton,
    IonButtons,
    CardAvatarComponent,
    IonChip,
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
  readonly iconPhotoOf = (card: Card): string | undefined => photoOf(card.photos, 'icon')?.id;
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastController);
  private readonly transloco = inject(TranslocoService);
  readonly scanner = inject(BARCODE_SCANNER);

  readonly cards = signal<Card[]>([]);
  readonly loaded = signal(false);
  readonly tags = signal<Tag[]>([]);
  readonly query = signal('');
  readonly selectedTag = signal<string | undefined>(undefined);
  readonly visibleCards = computed(() => filterCards(this.cards(), this.query(), this.selectedTag()));

  constructor() {
    addIcons({ add, scanOutline, star, swapVerticalOutline });
  }

  async ionViewWillEnter(): Promise<void> {
    const [cards, tags] = await Promise.all([this.cardService.list(), this.cardService.listTags()]);
    this.cards.set(cards);
    this.tags.set(tags);
    if (!tags.some((tag) => tag.id === this.selectedTag())) {
      this.selectedTag.set(undefined);
    }
    this.loaded.set(true);
  }

  toggleTag(id: string): void {
    this.selectedTag.update((selected) => (selected === id ? undefined : id));
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
