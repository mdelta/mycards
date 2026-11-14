import type { Type } from '@angular/core';
import type { Routes } from '@angular/router';

import type { CardEditorPage } from './ui/pages/card-editor/card-editor.page';

const loadCardEditor = (): Promise<Type<CardEditorPage>> =>
  import('./ui/pages/card-editor/card-editor.page').then((m) => m.CardEditorPage);

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./ui/pages/home/home.page').then((m) => m.HomePage),
  },
  { path: 'cards/new', loadComponent: loadCardEditor },
  {
    path: 'cards/:id',
    loadComponent: () => import('./ui/pages/card-detail/card-detail.page').then((m) => m.CardDetailPage),
  },
  { path: 'cards/:id/edit', loadComponent: loadCardEditor },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
