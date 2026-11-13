import type { EnvironmentProviders, Provider } from '@angular/core';
import { InjectionToken, inject, makeEnvironmentProviders } from '@angular/core';

import type { CardRepository } from '../domain/ports/card-repository';
import { CardService } from '../domain/services/card-service';

import { CapacitorSqlDatabase } from './sqlite/capacitor-sql-database';
import { migrate } from './sqlite/migrations';
import { openConnection } from './sqlite/open-connection';
import type { SqlDatabase } from './sqlite/sql-database';
import { SqliteCardRepository } from './sqlite/sqlite-card-repository';
import { SystemClock } from './system/system-clock';
import { UuidGenerator } from './system/uuid-generator';

export const SQL_DATABASE = new InjectionToken<SqlDatabase>('SqlDatabase');
export const CARD_REPOSITORY = new InjectionToken<CardRepository>('CardRepository');

/** Wires the domain services to the platform adapters (composition root, arc42 5.2). */
export function provideCardStorage(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: SQL_DATABASE, useFactory: () => new CapacitorSqlDatabase(openConnection, migrate) },
    { provide: CARD_REPOSITORY, useFactory: () => new SqliteCardRepository(inject(SQL_DATABASE)) },
    cardServiceProvider(),
  ]);
}

/** `CardService` on top of whatever `CARD_REPOSITORY` is provided (tests provide a fake). */
export function cardServiceProvider(): Provider {
  return {
    provide: CardService,
    useFactory: () => new CardService(inject(CARD_REPOSITORY), new SystemClock(), new UuidGenerator()),
  };
}
