import type { EnvironmentProviders, Provider } from '@angular/core';
import { InjectionToken, inject, makeEnvironmentProviders } from '@angular/core';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { ScreenBrightness } from '@capacitor-community/screen-brightness';

import type { BarcodeRenderer } from '../domain/ports/barcode-renderer';
import type { CardRepository } from '../domain/ports/card-repository';
import type { PresentationMode } from '../domain/ports/presentation-mode';
import { CardService } from '../domain/services/card-service';

import { BwipBarcodeRenderer } from './barcode/bwip-barcode-renderer';
import { CapacitorPresentationMode } from './display/capacitor-presentation-mode';
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

/** `CardService` on top of whatever `CARD_REPOSITORY` is provided (tests provide a fake). */
export function cardServiceProvider(): Provider {
  return {
    provide: CardService,
    useFactory: () => new CardService(inject(CARD_REPOSITORY), new SystemClock(), new UuidGenerator()),
  };
}
