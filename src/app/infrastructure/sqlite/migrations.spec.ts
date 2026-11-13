import { createTestDatabase } from '../../../testing/sql-js-database';

import { MIGRATIONS, migrate } from './migrations';

describe('migrate', () => {
  it('creates the full card model schema and records the version', async () => {
    const db = await createTestDatabase({ migrated: false });

    await migrate(db);

    const tables = await db.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    expect(tables.map((t) => t.name)).toEqual(['card', 'card_tag', 'photo', 'schema_migration', 'tag', 'website']);
    expect(await db.query('SELECT version FROM schema_migration')).toEqual([{ version: MIGRATIONS.length }]);
  });

  it('is idempotent and only applies newer migrations', async () => {
    const db = await createTestDatabase();
    const next = { version: MIGRATIONS.length + 1, sql: 'ALTER TABLE card ADD COLUMN extra TEXT' };

    await migrate(db, [...MIGRATIONS, next]);
    await migrate(db, [...MIGRATIONS, next]);

    const versions = await db.query<{ version: number }>('SELECT version FROM schema_migration ORDER BY version');
    expect(versions.map((v) => v.version)).toEqual([1, 2]);
  });

  it('rolls back a failing migration completely', async () => {
    const db = await createTestDatabase();
    const broken = { version: 2, sql: 'CREATE TABLE extra (a TEXT); INSERT INTO missing VALUES (1);' };

    await expect(migrate(db, [...MIGRATIONS, broken])).rejects.toThrow();

    expect(await db.query("SELECT name FROM sqlite_master WHERE name = 'extra'")).toEqual([]);
    expect(await db.query('SELECT version FROM schema_migration')).toEqual([{ version: 1 }]);
  });
});
