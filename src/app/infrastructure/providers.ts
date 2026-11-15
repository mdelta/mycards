import { DOCUMENT } from '@angular/common';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { InjectionToken, inject, makeEnvironmentProviders } from '@angular/core';
import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { ScreenBrightness } from '@capacitor-community/screen-brightness';
import { BarcodeScanner as MlKitPlugin } from '@capacitor-mlkit/barcode-scanning';
import { FilePicker } from '@capawesome/capacitor-file-picker';

import type { BackupFiles } from '../domain/ports/backup-files';
import type { BarcodeRenderer } from '../domain/ports/barcode-renderer';
import type { BarcodeScanner } from '../domain/ports/barcode-scanner';
import type { CardRepository } from '../domain/ports/card-repository';
import type { ExternalLauncher } from '../domain/ports/external-launcher';
import type { PresentationMode } from '../domain/ports/presentation-mode';
import { BackupService } from '../domain/services/backup-service';
import { CardService } from '../domain/services/card-service';

import { BrowserBackupFiles } from './backup/browser-backup-files';
import { CapacitorBackupFiles } from './backup/capacitor-backup-files';
import { ZipJsArchiveCodec } from './backup/zipjs-archive-codec';
import { BwipBarcodeRenderer } from './barcode/bwip-barcode-renderer';
import { MlKitBarcodeScanner } from './barcode/mlkit-barcode-scanner';
import { CapacitorPresentationMode } from './display/capacitor-presentation-mode';
import { BrowserExternalLauncher } from './links/browser-external-launcher';
import { CapacitorExternalLauncher } from './links/capacitor-external-launcher';
import { CapacitorSqlDatabase } from './sqlite/capacitor-sql-database';
import { migrate } from './sqlite/migrations';
import { openConnection } from './sqlite/open-connection';
import type { SqlDatabase } from './sqlite/sql-database';
import { SqliteCardRepository } from './sqlite/sqlite-card-repository';
import { SystemClock } from './system/system-clock';
import { UuidGenerator } from './system/uuid-generator';

export const SQL_DATABASE = new InjectionToken<SqlDatabase>('SqlDatabase');
export const CARD_REPOSITORY = new InjectionToken<CardRepository>('CardRepository');
export const BARCODE_RENDERER = new InjectionToken<BarcodeRenderer>('BarcodeRenderer');
export const PRESENTATION_MODE = new InjectionToken<PresentationMode>('PresentationMode');
export const BARCODE_SCANNER = new InjectionToken<BarcodeScanner>('BarcodeScanner');
export const BACKUP_FILES = new InjectionToken<BackupFiles>('BackupFiles');
/** Websites and shop search in other apps (F-06, ADR-0005). */
export const EXTERNAL_LAUNCHER = new InjectionToken<ExternalLauncher>('ExternalLauncher', {
  providedIn: 'root',
  factory: () =>
    Capacitor.isNativePlatform()
      ? new CapacitorExternalLauncher(AppLauncher)
      : new BrowserExternalLauncher(inject(DOCUMENT).defaultView!),
});

/** Wires the domain services to the platform adapters (composition root, arc42 5.2). */
export function provideCardStorage(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: SQL_DATABASE, useFactory: () => new CapacitorSqlDatabase(openConnection, migrate) },
    { provide: CARD_REPOSITORY, useFactory: () => new SqliteCardRepository(inject(SQL_DATABASE)) },
    cardServiceProvider(),
  ]);
}

/** Barcode drawing and screen control for showing a card (F-03, ADR-0017). */
export function provideCardPresentation(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: BARCODE_RENDERER, useFactory: () => new BwipBarcodeRenderer() },
    { provide: PRESENTATION_MODE, useFactory: () => new CapacitorPresentationMode(ScreenBrightness, KeepAwake) },
  ]);
}

/** Camera scanning with Google's ML Kit scanner (F-02, ADR-0010); unavailable in the browser. */
export function provideCardScanning(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: BARCODE_SCANNER, useFactory: () => new MlKitBarcodeScanner(MlKitPlugin, Capacitor.isNativePlatform()) },
  ]);
}

/** `CardService` on top of whatever `CARD_REPOSITORY` is provided (tests provide a fake). */
export function cardServiceProvider(): Provider {
  return {
    provide: CardService,
    useFactory: () => new CardService(inject(CARD_REPOSITORY), new SystemClock(), new UuidGenerator()),
  };
}

/** Export and import in the own format (F-05, F-11, ADR-0004): share sheet and file picker on Android. */
export function provideBackup(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: BACKUP_FILES,
      useFactory: () =>
        Capacitor.isNativePlatform()
          ? new CapacitorBackupFiles(Filesystem, Share, FilePicker)
          : new BrowserBackupFiles(inject(DOCUMENT)),
    },
    backupServiceProvider(),
  ]);
}

/** `BackupService` on top of whatever `CARD_REPOSITORY` is provided (tests provide a fake). */
export function backupServiceProvider(): Provider {
  return {
    provide: BackupService,
    useFactory: () => new BackupService(inject(CARD_REPOSITORY), new ZipJsArchiveCodec(), new SystemClock(), new UuidGenerator()),
  };
}
