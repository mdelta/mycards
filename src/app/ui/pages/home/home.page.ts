import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ViewWillEnter } from '@ionic/angular';
import {
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
} from '@ionic/angular';
import { TranslocoDirective } from '@jsverse/transloco';
import { addIcons } from 'ionicons';
import { add, star } from 'ionicons/icons';

import type { Card } from '../../../domain/model/card';
import { filterCards } from '../../../domain/services/card-filter';
import { CardService } from '../../../domain/services/card-service';

/** Card list: favorites first, search (F-04, F-12). */
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
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

  readonly cards = signal<Card[]>([]);
  readonly loaded = signal(false);
  readonly query = signal('');
  readonly visibleCards = computed(() => filterCards(this.cards(), this.query()));

  constructor() {
    addIcons({ add, star });
  }

  async ionViewWillEnter(): Promise<void> {
    this.cards.set(await this.cardService.list());
    this.loaded.set(true);
  }

  onSearch(event: CustomEvent<{ value?: string | null }>): void {
    this.query.set(event.detail.value ?? '');
  }
}
