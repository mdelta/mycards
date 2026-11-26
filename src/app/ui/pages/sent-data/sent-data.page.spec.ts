import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';

import en from '../../../../assets/i18n/en.json';
import type { SentReport } from '../../../domain/model/telemetry';
import { TELEMETRY } from '../../../infrastructure/providers';

import { SentDataPage } from './sent-data.page';

describe('SentDataPage', () => {
  async function create(reports: SentReport[]): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [
        SentDataPage,
        TranslocoTestingModule.forRoot({
          langs: { en },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [provideRouter([]), { provide: TELEMETRY, useValue: { sentReports: async () => reports } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(SentDataPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('says when nothing was sent', async () => {
    const page = await create([]);

    expect(page.querySelector('[data-testid="sent-data-empty"]')?.textContent).toContain('Nothing sent yet.');
  });

  it('shows each report exactly as sent', async () => {
    const page = await create([
      { kind: 'usage', sentAt: '2026-12-01T10:00:00.000Z', payload: { contexts: { usage: { cards: 3 } } } },
      { kind: 'crash', sentAt: '2026-11-30T10:00:00.000Z', payload: { exception: { values: [] } } },
    ]);

    expect(page.textContent).toContain('Usage summary');
    expect(page.textContent).toContain('Crash report');
    expect(page.querySelectorAll('pre')[0].textContent).toContain('"cards": 3');
  });
});
