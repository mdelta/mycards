import type { SqlDatabase } from './sql-database';

export interface Migration {
  version: number;
  sql: string;
}

/** Schema history (ADR-0003, ADR-0016). Never edit a released migration; append a new one. */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE card (
        id TEXT PRIMARY KEY NOT NULL,
        store_name TEXT NOT NULL,
        card_id TEXT NOT NULL,
        barcode_value TEXT,
        barcode_type TEXT,
        note TEXT,
        valid_from TEXT,
        expiry TEXT,
        balance REAL,
        balance_type TEXT,
        color TEXT,
        icon TEXT,
        favorite INTEGER NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        show_on_lock_screen INTEGER NOT NULL DEFAULT 0,
        homepage_url TEXT,
        shop_search_term TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_used_at TEXT
      );
      CREATE TABLE tag (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL UNIQUE
      );
      CREATE TABLE card_tag (
        card_id TEXT NOT NULL REFERENCES card (id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tag (id) ON DELETE CASCADE,
        PRIMARY KEY (card_id, tag_id)
      );
      CREATE TABLE website (
        id TEXT PRIMARY KEY NOT NULL,
        card_id TEXT NOT NULL REFERENCES card (id) ON DELETE CASCADE,
        label TEXT,
        url TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE photo (
        id TEXT PRIMARY KEY NOT NULL,
        card_id TEXT NOT NULL REFERENCES card (id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        file_ref TEXT NOT NULL
      );
    `,
  },
];

/** Applies all migrations newer than the stored schema version, each in its own transaction. */
export async function migrate(db: SqlDatabase, migrations: Migration[] = MIGRATIONS): Promise<void> {
  await db.execute('CREATE TABLE IF NOT EXISTS schema_migration (version INTEGER PRIMARY KEY NOT NULL)');
  const [{ version }] = await db.query<{ version: number | null }>(
    'SELECT MAX(version) AS version FROM schema_migration',
  );
  const pending = migrations.filter((m) => m.version > (version ?? 0)).sort((a, b) => a.version - b.version);
  for (const migration of pending) {
    await db.transaction(async (tx) => {
      await tx.execute(migration.sql);
      await tx.run('INSERT INTO schema_migration (version) VALUES (?)', [migration.version]);
    });
  }
}
