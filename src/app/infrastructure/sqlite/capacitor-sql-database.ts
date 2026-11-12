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
 * `initialize` (migrations) once, and serializes transactions.
 */
export class CapacitorSqlDatabase implements SqlDatabase {
  private opened?: Promise<OpenedConnection>;
  private inTransaction = false;
  private transactionQueue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly open: () => Promise<OpenedConnection>,
    private readonly initialize: (db: SqlDatabase) => Promise<void> = async () => undefined,
  ) {}

  async execute(sql: string): Promise<void> {
    const { connection } = await this.connection();
    await connection.execute(sql, !this.inTransaction);
    await this.persistUnlessInTransaction();
  }

  async query<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    const { connection } = await this.connection();
    return ((await connection.query(sql, params)).values ?? []) as T[];
  }

  async run(sql: string, params: SqlValue[] = []): Promise<void> {
    const { connection } = await this.connection();
    await connection.run(sql, params, !this.inTransaction);
    await this.persistUnlessInTransaction();
  }

  transaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.inTransaction) {
      return work();
    }
    const result = this.transactionQueue.then(() => this.runTransaction(work));
    this.transactionQueue = result.catch(() => undefined);
    return result;
  }

  private async runTransaction<T>(work: () => Promise<T>): Promise<T> {
    const { connection, persist } = await this.connection();
    await connection.beginTransaction();
    this.inTransaction = true;
    try {
      const result = await work();
      await connection.commitTransaction();
      return result;
    } catch (error) {
      await connection.rollbackTransaction();
      throw error;
    } finally {
      this.inTransaction = false;
      await persist();
    }
  }

  private connection(): Promise<OpenedConnection> {
    this.opened ??= this.open().then(async (opened) => {
      // Mark as opened before `initialize` so that it can use this database without recursion.
      this.opened = Promise.resolve(opened);
      await this.initialize(this);
      return opened;
    });
    return this.opened;
  }

  private async persistUnlessInTransaction(): Promise<void> {
    if (!this.inTransaction) {
      await (await this.connection()).persist();
    }
  }
}
