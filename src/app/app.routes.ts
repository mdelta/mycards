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
    path: 'backup',
    loadComponent: () => import('./ui/pages/backup/backup.page').then((m) => m.BackupPage),
  },
  {
    path: 'settings',
    loadComponent: () => import('./ui/pages/settings/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: 'settings/privacy',
    loadComponent: () => import('./ui/pages/privacy/privacy.page').then((m) => m.PrivacyPage),
  },
  {
    path: 'settings/licenses',
    loadComponent: () => import('./ui/pages/licenses/licenses.page').then((m) => m.LicensesPage),
  },
  {
    path: 'settings/sent-data',
    loadComponent: () => import('./ui/pages/sent-data/sent-data.page').then((m) => m.SentDataPage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
