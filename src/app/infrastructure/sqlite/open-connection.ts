import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

import type { OpenedConnection } from './capacitor-sql-database';

const DATABASE = 'mycards';

/** Opens the app database; in the browser via the `jeep-sqlite` WebAssembly store (ADR-0003). */
export async function openConnection(): Promise<OpenedConnection> {
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const isWeb = Capacitor.getPlatform() === 'web';
  if (isWeb) {
    await initWebStore(sqlite);
  }
  const consistent = (await sqlite.checkConnectionsConsistency()).result;
  const exists = (await sqlite.isConnection(DATABASE, false)).result;
  const connection =
    consistent && exists
      ? await sqlite.retrieveConnection(DATABASE, false)
      : await sqlite.createConnection(DATABASE, false, 'no-encryption', 1, false);
  await connection.open();
  await connection.execute('PRAGMA foreign_keys = ON', false);
  return {
    connection,
    persist: isWeb ? () => sqlite.saveToStore(DATABASE) : async () => undefined,
  };
}

async function initWebStore(sqlite: SQLiteConnection): Promise<void> {
  const { defineCustomElements } = await import('jeep-sqlite/loader');
  await defineCustomElements(window);
  if (!document.querySelector('jeep-sqlite')) {
    const element = document.createElement('jeep-sqlite');
    document.body.appendChild(element);
  }
  await customElements.whenDefined('jeep-sqlite');
  await sqlite.initWebStore();
}
