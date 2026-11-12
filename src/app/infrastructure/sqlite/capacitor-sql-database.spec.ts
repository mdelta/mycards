import type { OpenedConnection, SqliteConnectionLike } from './capacitor-sql-database';
import { CapacitorSqlDatabase } from './capacitor-sql-database';
import type { SqlValue } from './sql-database';

class FakeConnection implements SqliteConnectionLike {
  readonly calls: string[] = [];
  rows: unknown[] | undefined = [];

  async execute(statements: string, transaction?: boolean): Promise<void> {
    this.calls.push(`execute ${statements} tx=${transaction}`);
  }
  async query(statement: string, values?: SqlValue[]): Promise<{ values?: unknown[] }> {
    this.calls.push(`query ${statement} ${JSON.stringify(values)}`);
    return { values: this.rows };
  }
  async run(statement: string, values?: SqlValue[], transaction?: boolean): Promise<void> {
    this.calls.push(`run ${statement} ${JSON.stringify(values)} tx=${transaction}`);
  }
  async beginTransaction(): Promise<void> {
    this.calls.push('begin');
  }
  async commitTransaction(): Promise<void> {
    this.calls.push('commit');
  }
  async rollbackTransaction(): Promise<void> {
    this.calls.push('rollback');
  }
}

describe('CapacitorSqlDatabase', () => {
  let connection: FakeConnection;
  let opened: OpenedConnection;
  let openCount: number;
  const open = async (): Promise<OpenedConnection> => {
    openCount++;
    return opened;
  };

  beforeEach(() => {
    connection = new FakeConnection();
    openCount = 0;
    opened = {
      connection,
      persist: async () => {
        connection.calls.push('persist');
      },
    };
  });

  it('opens lazily and once, running the initializer before the first statement', async () => {
    const db = new CapacitorSqlDatabase(open, (init) => init.execute('INIT'));
    expect(openCount).toBe(0);

    await Promise.all([db.query('SELECT 1'), db.query('SELECT 2')]);

    expect(openCount).toBe(1);
    expect(connection.calls[0]).toBe('execute INIT tx=true');
    expect(connection.calls.filter((c) => c.startsWith('query'))).toHaveLength(2);
  });

  it('returns query rows and treats missing values as empty', async () => {
    const db = new CapacitorSqlDatabase(open);
    connection.rows = [{ a: 1 }];
    expect(await db.query('SELECT a', ['x'])).toEqual([{ a: 1 }]);

    connection.rows = undefined;
    expect(await db.query('SELECT a')).toEqual([]);
  });

  it('runs single statements in their own transaction and persists them', async () => {
    const db = new CapacitorSqlDatabase(open);

    await db.run('INSERT', [1]);
    await db.execute('DDL');

    expect(connection.calls).toEqual(['run INSERT [1] tx=true', 'persist', 'execute DDL tx=true', 'persist']);
  });

  it('commits a transaction and persists once', async () => {
    const db = new CapacitorSqlDatabase(open);

    const result = await db.transaction(async () => {
      await db.run('A');
      await db.transaction(() => db.execute('B'));
      return 42;
    });

    expect(result).toBe(42);
    expect(connection.calls).toEqual(['begin', 'run A [] tx=false', 'execute B tx=false', 'commit', 'persist']);
  });

  it('rolls back a failing transaction and rethrows', async () => {
    const db = new CapacitorSqlDatabase(open);

    await expect(
      db.transaction(async () => {
        await db.run('A');
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(connection.calls).toEqual(['begin', 'run A [] tx=false', 'rollback', 'persist']);
  });

  it('serializes concurrent transactions', async () => {
    const db = new CapacitorSqlDatabase(open);

    await Promise.all([
      db.transaction(() => db.run('first')).catch(() => undefined),
      db.transaction(() => db.run('second')),
    ]);

    expect(connection.calls).toEqual([
      'begin',
      'run first [] tx=false',
      'commit',
      'persist',
      'begin',
      'run second [] tx=false',
      'commit',
      'persist',
    ]);
  });
});
