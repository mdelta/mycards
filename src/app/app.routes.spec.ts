import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { HomePage } from './ui/pages/home/home.page';
import { LicensesPage } from './ui/pages/licenses/licenses.page';
import { PrivacyPage } from './ui/pages/privacy/privacy.page';
import { SettingsPage } from './ui/pages/settings/settings.page';

describe('routes', () => {
  it('redirects the empty path to the lazily loaded home page', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/');

    expect(router.url).toBe('/home');
    const home = routes.find((route) => route.path === 'home');
    expect(await home?.loadComponent?.()).toBe(HomePage);
  });

  it('lazily loads the settings pages', async () => {
    const load = (path: string) => routes.find((route) => route.path === path)?.loadComponent?.();

    expect(await load('settings')).toBe(SettingsPage);
    expect(await load('settings/privacy')).toBe(PrivacyPage);
    expect(await load('settings/licenses')).toBe(LicensesPage);
  });
});
