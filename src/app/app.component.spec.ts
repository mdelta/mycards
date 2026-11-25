import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IonRouterOutlet, Platform } from '@ionic/angular';

import { AppComponent } from './app.component';
import { EXIT_APP } from './infrastructure/providers';

describe('AppComponent', () => {
  let onBack: () => void;
  const exitApp = vi.fn(async () => undefined);

  beforeEach(async () => {
    exitApp.mockClear();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: EXIT_APP, useValue: exitApp },
        {
          provide: Platform,
          useValue: {
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
