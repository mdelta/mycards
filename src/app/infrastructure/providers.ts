import { DOCUMENT } from '@angular/common';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { InjectionToken, Injector, inject, isDevMode, makeEnvironmentProviders } from '@angular/core';
import { App } from '@capacitor/app';
import { AppLauncher } from '@capacitor/app-launcher';
import { Camera } from '@capacitor/camera';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { ScreenBrightness } from '@capacitor-community/screen-brightness';
import { BarcodeScanner as MlKitPlugin } from '@capacitor-mlkit/barcode-scanning';
import { FilePicker } from '@capawesome/capacitor-file-picker';

import type { AppInfo } from '../domain/ports/app-info';
import type { BackupFiles } from '../domain/ports/backup-files';
import type { BarcodeRenderer } from '../domain/ports/barcode-renderer';
import type { BarcodeScanner } from '../domain/ports/barcode-scanner';
import type { CardRepository } from '../domain/ports/card-repository';
import type { ExternalLauncher } from '../domain/ports/external-launcher';
import type { PhotoStore } from '../domain/ports/photo-store';
import type { PresentationMode } from '../domain/ports/presentation-mode';
import type { SettingsStore } from '../domain/ports/settings-store';
import { BackupService } from '../domain/services/backup-service';
import { CardService } from '../domain/services/card-service';
import { LockScreenService } from '../domain/services/lock-screen-service';
import { NotifyingCardRepository } from '../domain/services/notifying-card-repository';
import { PhotoService } from '../domain/services/photo-service';
import { TelemetryService } from '../domain/services/telemetry-service';

import { BrowserBackupFiles } from './backup/browser-backup-files';
import { CapacitorBackupFiles } from './backup/capacitor-backup-files';
import { ZipJsArchiveCodec } from './backup/zipjs-archive-codec';
import { BwipBarcodeRenderer } from './barcode/bwip-barcode-renderer';
import { MlKitBarcodeScanner } from './barcode/mlkit-barcode-scanner';
import { CapacitorPresentationMode } from './display/capacitor-presentation-mode';
import { BrowserExternalLauncher } from './links/browser-external-launcher';
import { CapacitorExternalLauncher } from './links/capacitor-external-launcher';
import type { LockScreenPlugin } from './lock-screen/capacitor-lock-screen';
import { CapacitorLockScreen } from './lock-screen/capacitor-lock-screen';
import { CanvasImageProcessor } from './photos/canvas-image-processor';
import { CapacitorPhotoSource } from './photos/capacitor-photo-source';
import { FilesystemPhotoStore } from './photos/filesystem-photo-store';
import { PreferencesSettingsStore } from './settings/preferences-settings-store';
import { CapacitorSqlDatabase } from './sqlite/capacitor-sql-database';
import { migrate } from './sqlite/migrations';
import { openConnection } from './sqlite/open-connection';
import type { SqlDatabase } from './sqlite/sql-database';
import { SqliteCardRepository } from './sqlite/sqlite-card-repository';
import { CapacitorAppInfo } from './system/capacitor-app-info';
import { SystemClock } from './system/system-clock';
import { UuidGenerator } from './system/uuid-generator';
import { BUILD_SENTRY_DSN } from './telemetry/build-config';
import { PreferencesTelemetryStore } from './telemetry/preferences-telemetry-store';
import { SentryReportSender } from './telemetry/sentry-report-sender';

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

/** Photo files in the app sandbox (F-09, ADR-0003). */
export const PHOTO_STORE = new InjectionToken<PhotoStore>('PhotoStore', {
  providedIn: 'root',
  factory: () => new FilesystemPhotoStore(Filesystem),
});

/** App settings such as the theme (R-4, ADR-0019). */
export const SETTINGS_STORE = new InjectionToken<SettingsStore>('SettingsStore', {
  providedIn: 'root',
  factory: () => new PreferencesSettingsStore(Preferences),
});

export const APP_INFO = new InjectionToken<AppInfo>('AppInfo', {
  providedIn: 'root',
  factory: () => new CapacitorAppInfo(App, Capacitor.isNativePlatform()),
});

/** Opt-in crash reports and usage data via Sentry (R-1, R-3, ADR-0018). */
export const TELEMETRY = new InjectionToken<TelemetryService>('Telemetry', {
  providedIn: 'root',
  factory: () => {
    const injector = inject(Injector);
    const sender = new SentryReportSender(
      BUILD_SENTRY_DSN,
      () => import('@sentry/browser'),
      Device,
      async () => (Capacitor.isNativePlatform() ? App.getInfo() : undefined),
      isDevMode() ? 'development' : 'production',
    );
    return new TelemetryService(
      new PreferencesTelemetryStore(Preferences),
      sender,
      () => injector.get(CARD_REPOSITORY),
      new SystemClock(),
    );
  },
});

/** Quick Settings tile showing marked cards over the lock screen (F-08, ADR-0006). */
export const LOCK_SCREEN = new InjectionToken<LockScreenService>('LockScreen', {
  providedIn: 'root',
  factory: () => {
    const injector = inject(Injector);
    const document = inject(DOCUMENT);
    return new LockScreenService(
      new CapacitorLockScreen(Filesystem, registerPlugin<LockScreenPlugin>('LockScreen'), Capacitor.isNativePlatform()),
      () => injector.get(CARD_REPOSITORY),
      new BwipBarcodeRenderer(() => document.createElement('canvas')),
    );
  },
});

/** Closes the app; Ionic's Back handling replaces Android's default once `@capacitor/app` is installed. */
export const EXIT_APP = new InjectionToken<() => Promise<void>>('ExitApp', {
  providedIn: 'root',
  factory: () => () => App.exitApp(),
});

/** Wires the domain services to the platform adapters (composition root, arc42 5.2). */
export function provideCardStorage(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: SQL_DATABASE, useFactory: () => new CapacitorSqlDatabase(openConnection, migrate) },
    {
      provide: CARD_REPOSITORY,
      useFactory: () => {
        const injector = inject(Injector);
        // Card changes update the lock-screen cards (ADR-0006).
        return new NotifyingCardRepository(new SqliteCardRepository(inject(SQL_DATABASE)), () => {
          injector
            .get(LOCK_SCREEN)
            .sync()
            .catch(() => undefined);
        });
      },
    },
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

/** Card photos and custom icon images (F-09, ADR-0003). */
export function providePhotos(): EnvironmentProviders {
  return makeEnvironmentProviders([photoServiceProvider()]);
}

/** `PhotoService` on top of whatever `CARD_REPOSITORY` and `PHOTO_STORE` are provided. */
export function photoServiceProvider(): Provider {
  return {
    provide: PhotoService,
    useFactory: () =>
      new PhotoService(
        new CapacitorPhotoSource(Camera),
        new CanvasImageProcessor(inject(DOCUMENT)),
        inject(PHOTO_STORE),
        inject(CARD_REPOSITORY),
        new UuidGenerator(),
      ),
  };
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
    useFactory: () =>
      new BackupService(
        inject(CARD_REPOSITORY),
        new ZipJsArchiveCodec(),
        new SystemClock(),
        new UuidGenerator(),
        inject(PHOTO_STORE),
        new CanvasImageProcessor(inject(DOCUMENT)),
      ),
  };
}
