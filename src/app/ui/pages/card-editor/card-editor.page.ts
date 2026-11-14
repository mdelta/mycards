import type { OnInit } from '@angular/core';
import { Component, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
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
import { trash } from 'ionicons/icons';

import type { BarcodeType } from '../../../domain/model/barcode-type';
import { BARCODE_TYPES, isBarcodeType } from '../../../domain/model/barcode-type';
import type { Card } from '../../../domain/model/card';
import type { CardDraft, CardValidationError } from '../../../domain/services/card-draft';
import { CardService, InvalidCardError } from '../../../domain/services/card-service';

/** Manual card creation and editing (F-01, F-10). Validation rules live in `CardService`. */
@Component({
  selector: 'app-card-editor',
  templateUrl: 'card-editor.page.html',
  imports: [
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonList,
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
  readonly notFound = signal(false);
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
  });

  constructor() {
    addIcons({ trash });
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
    const id = this.id();
    if (!id) {
      this.prefillScan();
      return;
    }
    const card = await this.cardService.get(id);
    if (card) {
      this.form.setValue(toFormValue(card));
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

  async save(): Promise<void> {
    const draft = toDraft(this.form.getRawValue());
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
    for (const error of errors) {
      const control = this.form.controls[this.fieldFor(error)];
      control.setErrors({ ...control.errors, [error]: true });
      control.markAsTouched();
    }
  }

  private fieldFor(error: CardValidationError): keyof FormValue {
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
    const t = (key: string, params?: Record<string, string>): string =>
      this.transloco.translate(`cardEditor.${key}`, params);
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
}

type FormValue = CardEditorPage['form']['value'] & {};

const ERROR_FIELDS: Record<Exclude<CardValidationError, 'barcodeValueInvalid'>, keyof FormValue> = {
  storeNameRequired: 'storeName',
  cardIdRequired: 'cardId',
  balanceInvalid: 'balance',
  expiryBeforeValidFrom: 'expiry',
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
  };
}

function toDraft(value: Required<FormValue>): CardDraft {
  const { barcodeType, balance, ...rest } = value;
  return {
    ...rest,
    barcodeType: barcodeType || undefined,
    balance: balance === '' || balance === null ? undefined : Number(balance),
  };
}
