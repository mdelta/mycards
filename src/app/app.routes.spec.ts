import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { HomePage } from './ui/pages/home/home.page';

describe('routes', () => {
  it('redirects the empty path to the lazily loaded home page', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/');

    expect(router.url).toBe('/home');
    const home = routes.find((route) => route.path === 'home');
    expect(await home?.loadComponent?.()).toBe(HomePage);
  });
});
