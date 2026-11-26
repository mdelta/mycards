import { DatePipe, JsonPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  IonAccordion,
  IonAccordionGroup,
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonNote,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { TranslocoDirective } from '@jsverse/transloco';

import type { SentReport } from '../../../domain/model/telemetry';
import { TELEMETRY } from '../../../infrastructure/providers';

/** Every report recently sent to Sentry, exactly as sent (ADR-0018). */
@Component({
  selector: 'app-sent-data',
  templateUrl: 'sent-data.page.html',
  styleUrls: ['sent-data.page.scss'],
  imports: [
    DatePipe,
    JsonPipe,
    IonAccordion,
    IonAccordionGroup,
    IonBackButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonNote,
    IonText,
    IonTitle,
    IonToolbar,
    TranslocoDirective,
  ],
})
export class SentDataPage {
  readonly reports = signal<SentReport[] | undefined>(undefined);

  constructor() {
    void inject(TELEMETRY)
      .sentReports()
      .then((reports) => this.reports.set(reports));
  }
}
