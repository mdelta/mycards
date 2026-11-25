import { NgTemplateOutlet } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  IonAccordion,
  IonAccordionGroup,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { TranslocoDirective } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import type { LibraryLicense } from '../../../domain/services/licenses';
import { parseAndroidLicenses, parseWebLicenses } from '../../../domain/services/licenses';
import { EXTERNAL_LAUNCHER } from '../../../infrastructure/providers';
import { SOURCE_CODE_URL } from '../settings/settings.page';

export const APP_LICENSE_URL = `${SOURCE_CODE_URL}/blob/main/LICENSE`;

/** License of MyCards and of all bundled libraries (R-4, ADR-0019). */
@Component({
  selector: 'app-licenses',
  templateUrl: 'licenses.page.html',
  styleUrls: ['licenses.page.scss'],
  imports: [
    NgTemplateOutlet,
    IonAccordion,
    IonAccordionGroup,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonNote,
    IonTitle,
    IonToolbar,
    TranslocoDirective,
  ],
})
export class LicensesPage {
  private readonly http = inject(HttpClient);
  private readonly launcher = inject(EXTERNAL_LAUNCHER);
  readonly appLicenseUrl = APP_LICENSE_URL;
  /** `undefined` while loading, `null` if the build has no list. */
  readonly android = signal<LibraryLicense[] | null | undefined>(undefined);
  readonly web = signal<LibraryLicense[] | null | undefined>(undefined);

  constructor() {
    firstValueFrom(
      this.http.get<Parameters<typeof parseAndroidLicenses>[0]>('assets/licenses/android-libraries.json'),
    ).then(
      (data) => this.android.set(parseAndroidLicenses(data)),
      () => this.android.set(null),
    );
    // Angular writes this file only in production builds.
    firstValueFrom(this.http.get('3rdpartylicenses.txt', { responseType: 'text' })).then(
      (text) => this.web.set(parseWebLicenses(text)),
      () => this.web.set(null),
    );
  }

  open(url: string): void {
    void this.launcher.open(url);
  }
}
