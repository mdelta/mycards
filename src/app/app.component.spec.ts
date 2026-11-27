import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IonRouterOutlet, Platform } from '@ionic/angular';
import { Subject } from 'rxjs';

import { AppComponent } from './app.component';
import { EXIT_APP, LOCK_SCREEN, TELEMETRY } from './infrastructure/providers';

describe('AppComponent', () => {
  let onBack: () => void;
  const exitApp = vi.fn(async () => undefined);
  const resume = new Subject<void>();
  const lockScreen = { sync: vi.fn(async () => undefined) };
  const telemetry = { init: vi.fn(async () => undefined), sendUsageIfDue: vi.fn(async () => undefined) };

  beforeEach(async () => {
    exitApp.mockClear();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: EXIT_APP, useValue: exitApp },
        { provide: TELEMETRY, useValue: telemetry },
        { provide: LOCK_SCREEN, useValue: lockScreen },
        {
          provide: Platform,
          useValue: {
            resume,
            backButton: {
              subscribeWithPriority: (priority: number, handler: () => void) => {
                if (priority === -1) {
                  onBack = handler;
                }
              },
            },
          },
        },
      ],
    }).compileComponents();
  });

  function create(canGoBack: boolean): void {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    vi.spyOn(
      fixture.debugElement.query((el) => el.injector.get(IonRouterOutlet, null) !== null).injector.get(IonRouterOutlet),
      'canGoBack',
    ).mockReturnValue(canGoBack);
  }

  it('starts telemetry and checks the weekly usage summary when the app resumes', () => {
    create(false);
    expect(telemetry.init).toHaveBeenCalled();

    resume.next();

    expect(telemetry.sendUsageIfDue).toHaveBeenCalled();
  });

  it('writes the lock-screen cards at start', () => {
    create(false);

    expect(lockScreen.sync).toHaveBeenCalled();
  });

  it('closes the app on Back when there is no previous page', () => {
    create(false);

    onBack();

    expect(exitApp).toHaveBeenCalled();
  });

  it('leaves Back to the pages while there is a previous page', () => {
    create(true);

    onBack();

    expect(exitApp).not.toHaveBeenCalled();
  });
});
