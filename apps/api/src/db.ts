import { readdirSync, readFileSync } from 'node:fs';
import pg from 'pg';

/** A pool, or one client of it while inside `transaction()`. */
export type Db = pg.Pool | pg.PoolClient;

// COUNT(*) and friends come back as int8, which pg hands over as strings unless told otherwise.
pg.types.setTypeParser(pg.types.builtins.INT8, Number);

/** A pool of at most 10 connections; in production the server certificate is verified and a plain connection refused. */
export function openDb(url: string): pg.Pool {
  return new pg.Pool({
    connectionString: url,
    max: 10,
    connectionTimeoutMillis: 5000,
    ssl: process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: true } : false,
  });
}

export async function all<T>(db: Db, sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query(sql, params)).rows as T[];
}

export async function get<T>(db: Db, sql: string, params: unknown[] = []): Promise<T | undefined> {
  return (await all<T>(db, sql, params))[0];
}

/** Runs a statement and returns how many rows it touched. */
export async function run(db: Db, sql: string, params: unknown[] = []): Promise<number> {
  return (await db.query(sql, params)).rowCount ?? 0;
}

/** Runs `work` on one client between BEGIN and COMMIT; a throw rolls back and is rethrown. */
export async function transaction<T>(pool: pg.Pool, work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

const MIGRATIONS_DIR = new URL('../migrations/', import.meta.url);
// Any fixed number: processes starting together queue on it, so each migration runs once.
const MIGRATION_LOCK = 20261018;

/** Applies each `NNN-name.sql` in `dir` that `schema_migration` does not list yet, in file-name order, one transaction each. */
export async function migrate(pool: pg.Pool, dir: URL = MIGRATIONS_DIR): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK]);
    await client.query('CREATE TABLE IF NOT EXISTS schema_migration (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
    const applied = new Set((await client.query('SELECT name FROM schema_migration')).rows.map((row) => row.name as string));
    for (const name of readdirSync(dir).filter((file) => file.endsWith('.sql')).sort()) {
      if (applied.has(name)) continue;
      try {
        await client.query('BEGIN');
        await client.query(readFileSync(new URL(name, dir), 'utf8'));
        await client.query('INSERT INTO schema_migration (name, applied_at) VALUES ($1, $2)', [name, new Date().toISOString()]);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${name} failed: ${e instanceof Error ? e.message : String(e)}`, { cause: e });
      }
    }
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK]);
  } finally {
    client.release();
  }
}
