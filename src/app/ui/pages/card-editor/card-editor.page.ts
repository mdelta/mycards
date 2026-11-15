import type { OnInit } from '@angular/core';
import { Component, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  AlertController,
  IonAccordion,
  IonAccordionGroup,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
  NavController,
} from '@ionic/angular';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { addIcons } from 'ionicons';
import { add, closeCircleOutline, colorWandOutline, trash } from 'ionicons/icons';
import { map } from 'rxjs';

import type { BarcodeType } from '../../../domain/model/barcode-type';
import { BARCODE_TYPES, isBarcodeType } from '../../../domain/model/barcode-type';
import type { Card, Tag, WebsiteLink } from '../../../domain/model/card';
import { CARD_COLORS, cardInitialOf, isCardColor } from '../../../domain/model/card-appearance';
import type { CardDraft, CardValidationError } from '../../../domain/services/card-draft';
import { CardService, InvalidCardError } from '../../../domain/services/card-service';
import { CARD_ICONS, CARD_ICON_KEYS } from '../../card-icons';
import { CardAvatarComponent } from '../../components/card-avatar/card-avatar.component';

/**
 * Manual card creation and editing (F-01, F-10), including color, icon, tags and links (F-06, F-07,
 * ADR-0016). Validation rules live in `CardService`.
 */
@Component({
  selector: 'app-card-editor',
  templateUrl: 'card-editor.page.html',
  styleUrl: 'card-editor.page.scss',
  imports: [
    CardAvatarComponent,
    IonAccordion,
    IonAccordionGroup,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonSelect,
    IonSelectOption,
    IonText,
    IonTextarea,
    IonTitle,
    IonToggle,
    IonToolbar,
    ReactiveFormsModule,
    TranslocoDirective,
  ],
})
export class CardEditorPage implements OnInit {
  private readonly cardService = inject(CardService);
  private readonly nav = inject(NavController);
  private readonly alerts = inject(AlertController);
  private readonly transloco = inject(TranslocoService);

  /** Route parameter; undefined when creating a new card. */
  readonly id = input<string>();
  /** Query parameters set after a camera scan (F-02); pre-fill a new card. */
  readonly scannedType = input<string>();
  readonly scannedValue = input<string>();

  readonly barcodeTypes = BARCODE_TYPES;
  readonly colors = CARD_COLORS;
  readonly icons = CARD_ICONS;
  readonly iconKeys = CARD_ICON_KEYS;
  readonly initialOf = cardInitialOf;
  readonly notFound = signal(false);
  readonly tags = signal<Tag[]>([]);
  /** Edited outside the reactive form: rows are added and removed freely. */
  readonly websites = signal<Required<WebsiteLink>[]>([]);
  readonly websiteError = signal(false);
  readonly form = inject(NonNullableFormBuilder).group({
    storeName: '',
    cardId: '',
    barcodeType: '' as BarcodeType | '',
    barcodeValue: '',
    note: '',
    validFrom: '',
    expiry: '',
    balance: '' as string | number | null,
    balanceType: '',
    favorite: false,
    showOnLockScreen: false,
    color: '',
    icon: '',
    tagIds: new FormControl<string[]>([], { nonNullable: true }),
    homepageUrl: '',
    shopSearchTerm: '',
  });
  /** Form values the template previews live (avatar, palette and icon selection). */
  readonly appearance = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  constructor() {
    addIcons({ add, closeCircleOutline, colorWandOutline, trash });
    // A barcode value error refers to the previous type, so it no longer applies after a type change.
    this.form.controls.barcodeType.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      for (const control of [this.form.controls.cardId, this.form.controls.barcodeValue]) {
        if (control.hasError('barcodeValueInvalid')) {
          const { barcodeValueInvalid: _, ...others } = control.errors ?? {};
          control.setErrors(Object.keys(others).length ? others : null);
        }
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadCard();
    this.tags.set(await this.cardService.listTags());
  }

  private async loadCard(): Promise<void> {
    const id = this.id();
    if (!id) {
      this.prefillScan();
      return;
    }
    const card = await this.cardService.get(id);
    if (card) {
      this.form.setValue(toFormValue(card));
      this.websites.set(card.websites.map((site) => ({ label: site.label ?? '', url: site.url })));
    } else {
      this.notFound.set(true);
    }
  }

  private prefillScan(): void {
    const type = this.scannedType();
    const value = this.scannedValue();
    if (type && isBarcodeType(type) && value) {
      this.form.patchValue({ barcodeType: type, cardId: value });
    }
  }

  hasError(error: CardValidationError): boolean {
    return Object.values(this.form.controls).some((control) => control.hasError(error));
  }

  selectColor(color: string): void {
    this.form.controls.color.setValue(color);
  }

  selectIcon(icon: string): void {
    this.form.controls.icon.setValue(icon);
  }

  addWebsite(): void {
    this.websites.update((sites) => [...sites, { label: '', url: '' }]);
  }

  removeWebsite(index: number): void {
    this.websites.update((sites) => sites.filter((_, i) => i !== index));
    this.websiteError.set(false);
  }

  editWebsite(index: number, field: keyof WebsiteLink, event: CustomEvent<{ value?: string | null }>): void {
    const value = event.detail.value ?? '';
    this.websites.update((sites) => sites.map((site, i) => (i === index ? { ...site, [field]: value } : site)));
    this.websiteError.set(false);
  }

  /** Asks for a tag name, creates the tag if it is new and selects it. */
  async addTag(): Promise<void> {
    const alert = await this.alerts.create({
      header: this.translate('fields.newTag'),
      inputs: [{ name: 'name', placeholder: this.translate('fields.newTagPlaceholder') }],
      buttons: [
        { text: this.translate('cancel'), role: 'cancel' },
        { text: this.translate('ok'), role: 'confirm' },
      ],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss<{ values: { name: string } }>();
    const name = data?.values.name.trim();
    if (role !== 'confirm' || !name) {
      return;
    }
    const tag = await this.cardService.ensureTag(name);
    if (!this.tags().some((other) => other.id === tag.id)) {
      this.tags.update((tags) => [...tags, tag].sort((a, b) => a.name.localeCompare(b.name)));
    }
    const selected = this.form.controls.tagIds.value;
    if (!selected.includes(tag.id)) {
      this.form.controls.tagIds.setValue([...selected, tag.id]);
    }
  }

  async save(): Promise<void> {
    const draft = toDraft(this.form.getRawValue(), this.websites());
    const id = this.id();
    try {
      await (id ? this.cardService.update(id, draft) : this.cardService.create(draft));
    } catch (error) {
      if (error instanceof InvalidCardError) {
        this.showErrors(error.errors);
        return;
      }
      throw error;
    }
    await (id ? this.nav.navigateBack(['/cards', id]) : this.nav.navigateBack('/home'));
  }

  /**
   * Puts domain errors on their form controls, so Ionic shows them: it derives `ion-invalid` from the
   * control status and would overwrite a manually set class. Editing a field clears its error.
   */
  private showErrors(errors: CardValidationError[]): void {
    for (const control of Object.values(this.form.controls)) {
      control.setErrors(null);
    }
    this.websiteError.set(errors.includes('websiteUrlInvalid'));
    for (const error of errors.filter((e) => e !== 'websiteUrlInvalid')) {
      const control = this.form.controls[this.fieldFor(error)];
      control.setErrors({ ...control.errors, [error]: true });
      control.markAsTouched();
    }
  }

  private fieldFor(error: Exclude<CardValidationError, 'websiteUrlInvalid'>): keyof FormValue {
    if (error === 'barcodeValueInvalid') {
      return this.form.controls.barcodeValue.value.trim() ? 'barcodeValue' : 'cardId';
    }
    return ERROR_FIELDS[error];
  }

  async confirmDelete(): Promise<void> {
    const id = this.id();
    if (!id) {
      return;
    }
    const t = (key: string, params?: Record<string, string>): string => this.translate(key, params);
    const alert = await this.alerts.create({
      header: t('deleteConfirm.header'),
      message: t('deleteConfirm.message', { storeName: this.form.controls.storeName.value }),
      buttons: [
        { text: t('cancel'), role: 'cancel' },
        { text: t('delete'), role: 'destructive' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role === 'destructive') {
      await this.cardService.delete(id);
      await this.nav.navigateBack('/home');
    }
  }

  private translate(key: string, params?: Record<string, string>): string {
    return this.transloco.translate(`cardEditor.${key}`, params);
  }
}

type FormValue = CardEditorPage['form']['value'] & {};

const ERROR_FIELDS: Record<
  Exclude<CardValidationError, 'barcodeValueInvalid' | 'websiteUrlInvalid'>,
  keyof FormValue
> = {
  storeNameRequired: 'storeName',
  cardIdRequired: 'cardId',
  balanceInvalid: 'balance',
  expiryBeforeValidFrom: 'expiry',
  colorInvalid: 'color',
  homepageUrlInvalid: 'homepageUrl',
};

function toFormValue(card: Card): Required<FormValue> {
  return {
    storeName: card.storeName,
    cardId: card.cardId,
    barcodeType: card.barcodeType ?? '',
    barcodeValue: card.barcodeValue ?? '',
    note: card.note ?? '',
    validFrom: card.validFrom ?? '',
    expiry: card.expiry ?? '',
    balance: card.balance ?? '',
    balanceType: card.balanceType ?? '',
    favorite: card.favorite,
    showOnLockScreen: card.showOnLockScreen,
    color: card.color && isCardColor(card.color) ? card.color : '',
    icon: card.icon ?? '',
    tagIds: card.tagIds,
    homepageUrl: card.homepageUrl ?? '',
    shopSearchTerm: card.shopSearchTerm ?? '',
  };
}

function toDraft(value: Required<FormValue>, websites: WebsiteLink[]): CardDraft {
  const { barcodeType, balance, ...rest } = value;
  return {
    ...rest,
    websites,
    barcodeType: barcodeType || undefined,
    balance: balance === '' || balance === null ? undefined : Number(balance),
  };
}
