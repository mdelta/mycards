import type { SqlDatabase, SqlValue } from './sql-database';

/** Subset of the `@capacitor-community/sqlite` `SQLiteDBConnection` API used here. */
export interface SqliteConnectionLike {
  execute(statements: string, transaction?: boolean): Promise<unknown>;
  query(statement: string, values?: SqlValue[]): Promise<{ values?: unknown[] }>;
  run(statement: string, values?: SqlValue[], transaction?: boolean): Promise<unknown>;
  beginTransaction(): Promise<unknown>;
  commitTransaction(): Promise<unknown>;
  rollbackTransaction(): Promise<unknown>;
}

export interface OpenedConnection {
  connection: SqliteConnectionLike;
  /** Flushes writes to durable storage (needed for the web store only). */
  persist(): Promise<void>;
}

/**
 * `SqlDatabase` on the Capacitor SQLite plugin (ADR-0003). Opens the connection lazily, runs
 * `initialize` (migrations) before any other operation, and executes operations one at a time,
 * so a transaction never interleaves with other statements.
 */
export class CapacitorSqlDatabase implements SqlDatabase {
  private ready?: Promise<SqlDatabase>;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly open: () => Promise<OpenedConnection>,
    private readonly initialize: (db: SqlDatabase) => Promise<void> = async () => undefined,
  ) {}

  execute(sql: string): Promise<void> {
    return this.serialize((db) => db.execute(sql));
  }

  query<T>(sql: string, params?: SqlValue[]): Promise<T[]> {
    return this.serialize((db) => db.query<T>(sql, params));
  }

  run(sql: string, params?: SqlValue[]): Promise<void> {
    return this.serialize((db) => db.run(sql, params));
  }

  transaction<T>(work: (tx: SqlDatabase) => Promise<T>): Promise<T> {
    return this.serialize((db) => db.transaction(work));
  }

  private serialize<T>(operation: (db: SqlDatabase) => Promise<T>): Promise<T> {
    const result = this.queue.then(async () => operation(await this.connection()));
    this.queue = result.catch(() => undefined);
    return result;
  }

  private connection(): Promise<SqlDatabase> {
    this.ready ??= this.open()
      .then(async ({ connection, persist }) => {
        const db = new ConnectionSqlDatabase(connection, persist);
        await this.initialize(db);
        return db;
      })
      .catch((error: unknown) => {
        this.ready = undefined;
        throw error;
      });
    return this.ready;
  }
}

/** Unserialized `SqlDatabase` on an open connection; `inTransaction` instances belong to a transaction. */
class ConnectionSqlDatabase implements SqlDatabase {
  constructor(
    private readonly connection: SqliteConnectionLike,
    private readonly persist: () => Promise<void>,
    private readonly inTransaction = false,
  ) {}

  async execute(sql: string): Promise<void> {
    await this.connection.execute(sql, !this.inTransaction);
    await this.persistUnlessInTransaction();
  }

  async query<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    return ((await this.connection.query(sql, params)).values ?? []) as T[];
  }

  async run(sql: string, params: SqlValue[] = []): Promise<void> {
    await this.connection.run(sql, params, !this.inTransaction);
    await this.persistUnlessInTransaction();
  }

  async transaction<T>(work: (tx: SqlDatabase) => Promise<T>): Promise<T> {
    if (this.inTransaction) {
      return work(this);
    }
    await this.connection.beginTransaction();
    try {
      const result = await work(new ConnectionSqlDatabase(this.connection, this.persist, true));
      await this.connection.commitTransaction();
      return result;
    } catch (error) {
      await this.connection.rollbackTransaction();
      throw error;
    } finally {
      await this.persist();
    }
  }

  private async persistUnlessInTransaction(): Promise<void> {
    if (!this.inTransaction) {
      await this.persist();
    }
  }
}
