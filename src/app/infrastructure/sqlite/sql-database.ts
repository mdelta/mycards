export type SqlValue = string | number | null;

/** Minimal SQL access used by the SQLite adapters; implemented per platform (ADR-0003). */
export interface SqlDatabase {
  /** Runs one or more statements without parameters (e.g. DDL). */
  execute(sql: string): Promise<void>;
  query<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
  /**
   * Runs `work` atomically. Inside `work`, use only `tx` (not the outer database): statements on
   * `tx` belong to the transaction, and `tx.transaction` joins it.
   */
  transaction<T>(work: (tx: SqlDatabase) => Promise<T>): Promise<T>;
}
