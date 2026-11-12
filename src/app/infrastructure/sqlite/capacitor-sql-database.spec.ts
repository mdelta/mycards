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

  it('lets a transactional initializer finish before the first transaction (fresh database)', async () => {
    const db = new CapacitorSqlDatabase(open, (init) => init.transaction((tx) => tx.execute('MIGRATE')));

    await db.transaction((tx) => tx.run('SAVE'));

    expect(connection.calls).toEqual([
      'begin',
      'execute MIGRATE tx=false',
      'commit',
      'persist',
      'begin',
      'run SAVE [] tx=false',
      'commit',
      'persist',
    ]);
  });

  it('holds back concurrent requests until the initializer has finished', async () => {
    let finishInit!: () => void;
    const db = new CapacitorSqlDatabase(open, async (init) => {
      await new Promise<void>((resolve) => (finishInit = resolve));
      await init.execute('MIGRATE');
    });

    const first = db.query('SELECT 1');
    await Promise.resolve();
    const second = db.query('SELECT 2');
    await new Promise((resolve) => setTimeout(resolve));
    expect(connection.calls).toEqual([]);

    finishInit();
    await Promise.all([first, second]);
    expect(connection.calls[0]).toBe('execute MIGRATE tx=true');
  });

  it('retries opening after a failed open', async () => {
    let fail = true;
    const db = new CapacitorSqlDatabase(async () => {
      if (fail) {
        throw new Error('locked');
      }
      return opened;
    });

    await expect(db.query('SELECT 1')).rejects.toThrow('locked');
    fail = false;
    await expect(db.query('SELECT 1')).resolves.toEqual([]);
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

    const result = await db.transaction(async (tx) => {
      await tx.run('A');
      await tx.transaction((nested) => nested.execute('B'));
      return 42;
    });

    expect(result).toBe(42);
    expect(connection.calls).toEqual(['begin', 'run A [] tx=false', 'execute B tx=false', 'commit', 'persist']);
  });

  it('rolls back a failing transaction and rethrows', async () => {
    const db = new CapacitorSqlDatabase(open);

    await expect(
      db.transaction(async (tx) => {
        await tx.run('A');
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(connection.calls).toEqual(['begin', 'run A [] tx=false', 'rollback', 'persist']);
  });

  it('never interleaves other operations with a running transaction', async () => {
    const db = new CapacitorSqlDatabase(open);

    const results = await Promise.allSettled([
      db.transaction(async (tx) => {
        await tx.run('first');
        await new Promise((resolve) => setTimeout(resolve));
        throw new Error('boom');
      }),
      db.transaction((tx) => tx.run('second')),
      db.run('single'),
    ]);

    expect(results.map((r) => r.status)).toEqual(['rejected', 'fulfilled', 'fulfilled']);
    expect(connection.calls).toEqual([
      'begin',
      'run first [] tx=false',
      'rollback',
      'persist',
      'begin',
      'run second [] tx=false',
      'commit',
      'persist',
      'run single [] tx=true',
      'persist',
    ]);
  });
});
