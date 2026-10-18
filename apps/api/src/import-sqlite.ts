import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';
import { get, openDb, transaction } from './db.ts';

/** Parent tables first, so every foreign key already points at a row. */
const TABLES = ['household', 'profile', 'session', 'password_reset', 'invites', 'book', 'chapter_log', 'answer', 'question', 'reward', 'sign_in_attempt'];

// The profile-and-PIN release kept these; the accounts schema has no place for them.
const PIN_COLUMNS = new Set(['pin_hash', 'pin_failed_count', 'pin_locked_until']);
const role = (value: unknown) => (value === 'grown_up' ? 'parent' : value);

/**
 * Brings a profile-and-PIN release row up to the accounts schema: a grown-up is a parent, and each
 * person without a username gets one from a parent's e-mail or a reader's name, unique in the file.
 */
function upgrade(table: string, row: Record<string, unknown>, taken: Set<string>): Record<string, unknown> {
  if (table === 'book') return { ...row, added_by_role: role(row['added_by_role']) };
  if (table !== 'profile') return row;
  const upgraded = Object.fromEntries(Object.entries(row).filter(([column]) => !PIN_COLUMNS.has(column)));
  upgraded['role'] = role(row['role']);
  if (typeof row['email'] === 'string') upgraded['email'] = row['email'].toLowerCase();
  if (!row['username']) {
    const email = upgraded['email'] as string | null;
    const source = upgraded['role'] === 'parent' && email ? email.split('@')[0] : String(row['name']);
    const base = source.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 20).padEnd(3, '0');
    let username = base;
    for (let n = 2; taken.has(username); n++) username = `${base.slice(0, 18)}${n}`;
    upgraded['username'] = username;
  }
  taken.add(String(upgraded['username']).toLowerCase());
  return upgraded;
}

/** Copies every row of the SQLite release's file into an empty PostgreSQL database, in one transaction. Returns the rows per table. */
export async function importSqlite(sqlitePath: string, pool: Pool): Promise<Record<string, number>> {
  const source = new DatabaseSync(sqlitePath, { readOnly: true });
  try {
    return await transaction(pool, async (db) => {
      if (await get(db, 'SELECT 1 FROM household LIMIT 1')) {
        throw new Error('The target database already holds a household; import only into an empty database');
      }
      const counts: Record<string, number> = {};
      const usernames = new Set<string>();
      const tableExists = source.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?");
      for (const table of TABLES) {
        if (!tableExists.get(table)) continue;
        const rows = (source.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[]).map((row) => upgrade(table, row, usernames));
        for (const row of rows) {
          const columns = Object.keys(row);
          await db.query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})`, columns.map((c) => row[c]));
        }
        counts[table] = rows.length;
      }
      return counts;
    });
  } finally {
    source.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const db = openDb(url);
  const counts = await importSqlite(process.env.SHELFIE_DB ?? 'shelfie.db', db);
  await db.end();
  for (const [table, rows] of Object.entries(counts)) console.log(`${table}: ${rows} rows`);
}
