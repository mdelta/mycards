import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { TranslocoHttpLoader } from './transloco-loader';

describe('TranslocoHttpLoader', () => {
  it('loads the translation file of the requested language from assets/i18n', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const loader = TestBed.inject(TranslocoHttpLoader);
    const http = TestBed.inject(HttpTestingController);

    const translation = firstValueFrom(loader.getTranslation('en'));
    http.expectOne('assets/i18n/en.json').flush({ app: { title: 'MyCards' } });

    expect(await translation).toEqual({ app: { title: 'MyCards' } });
    http.verify();
  });
});
