export type SqlValue = string | number | null;

/** Minimal SQL access used by the SQLite adapters; implemented per platform (ADR-0003). */
export interface SqlDatabase {
  /** Runs one or more statements without parameters (e.g. DDL). */
  execute(sql: string): Promise<void>;
  query<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
  /** Runs `work` atomically; nested calls inside `work` use the same transaction. */
  transaction<T>(work: () => Promise<T>): Promise<T>;
}
