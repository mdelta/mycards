import { Component, computed, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';

import { cardColorOf, cardInitialOf } from '../../../domain/model/card-appearance';
import { CARD_ICONS } from '../../card-icons';

/**
 * Round card badge (ADR-0016): the custom image, else the chosen icon, else the store's first letter, on
 * the card color.
 */
@Component({
  selector: 'app-card-avatar',
  template: `
    <span class="avatar" [style.background-color]="background()" aria-hidden="true">
      @if (image(); as image) {
        <img [src]="image" alt="" />
      } @else if (iconData(); as icon) {
        <ion-icon [icon]="icon" />
      } @else {
        {{ initial() }}
      }
    </span>
  `,
  styles: `
    :host {
      display: inline-block;
    }
    .avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      color: #ffffff;
      font-size: 20px;
      font-weight: 600;
      overflow: hidden;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
  imports: [IonIcon],
})
export class CardAvatarComponent {
  readonly storeName = input.required<string>();
  readonly color = input<string | undefined>();
  readonly icon = input<string | undefined>();
  /** URL of the custom icon image. */
  readonly image = input<string | null | undefined>();

  readonly background = computed(() => cardColorOf({ storeName: this.storeName(), color: this.color() || undefined }));
  readonly initial = computed(() => cardInitialOf(this.storeName()));
  readonly iconData = computed(() => {
    const key = this.icon();
    return key ? CARD_ICONS[key] : undefined;
  });
}
