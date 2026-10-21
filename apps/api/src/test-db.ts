import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { migrate, openDb } from './db.ts';

/** The server tests create their throwaway databases on; the same value CI gives its service container. */
export const ADMIN_URL = process.env['DATABASE_URL'] ?? 'postgres://postgres:postgres@localhost:5432/postgres';

async function admin(sql: string) {
  const client = new pg.Client({ connectionString: ADMIN_URL });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

/** A fresh database of its own for one test file or one Playwright worker, migrated unless asked otherwise. */
export async function createTestDatabase({ migrated = true } = {}) {
  const name = `shelfie_test_${randomBytes(6).toString('hex')}`;
  await admin(`CREATE DATABASE ${name}`);
  const url = new URL(ADMIN_URL);
  url.pathname = `/${name}`;
  const pool = openDb(url.href);
  if (migrated) await migrate(pool);
  return {
    pool,
    url: url.href,
    async drop() {
      // A connection still closing when the database is force-dropped reports an error; the pool is being thrown away.
      pool.on('error', () => {});
      await pool.end();
      await admin(`DROP DATABASE ${name} WITH (FORCE)`);
    },
  };
}
