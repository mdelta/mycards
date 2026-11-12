import type { Database } from 'sql.js';
import initSqlJs from 'sql.js/dist/sql-asm.js';

import { migrate } from '../app/infrastructure/sqlite/migrations';
import type { SqlDatabase, SqlValue } from '../app/infrastructure/sqlite/sql-database';

/** `SqlDatabase` on an in-memory sql.js database, for testing the SQLite adapters with real SQL. */
export class SqlJsDatabase implements SqlDatabase {
  private inTransaction = false;

  constructor(readonly raw: Database) {}

  async execute(sql: string): Promise<void> {
    this.raw.exec(sql);
  }

  async query<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    const statement = this.raw.prepare(sql, params);
    const rows: T[] = [];
    while (statement.step()) {
      rows.push(statement.getAsObject() as T);
    }
    statement.free();
    return rows;
  }

  async run(sql: string, params: SqlValue[] = []): Promise<void> {
    this.raw.run(sql, params);
  }

  async transaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.inTransaction) {
      return work();
    }
    this.inTransaction = true;
    this.raw.exec('BEGIN');
    try {
      const result = await work();
      this.raw.exec('COMMIT');
      return result;
    } catch (error) {
      this.raw.exec('ROLLBACK');
      throw error;
    } finally {
      this.inTransaction = false;
    }
  }
}

export async function createTestDatabase({ migrated = true } = {}): Promise<SqlJsDatabase> {
  const SQL = await initSqlJs();
  const db = new SqlJsDatabase(new SQL.Database());
  await db.execute('PRAGMA foreign_keys = ON');
  if (migrated) {
    await migrate(db);
  }
  return db;
}
