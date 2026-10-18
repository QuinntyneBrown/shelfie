import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

// Columns added to tables after the first release. schema.sql only creates tables that are missing,
// so an existing database gets each of these through ALTER TABLE before the schema runs.
const addedColumns: [table: string, column: string, definition: string][] = [
  ['household', 'theme', "TEXT NOT NULL DEFAULT 'device' CHECK (theme IN ('device','light','dark'))"],
  ['profile', 'email', 'TEXT'],
  ['profile', 'password_hash', 'TEXT'],
  ['session', 'remember', 'INTEGER NOT NULL DEFAULT 1'],
  ['chapter_log', 'reviewed_at', 'TEXT'],
  ['chapter_log', 'sticker', 'TEXT'],
  ['chapter_log', 'note', 'TEXT'],
  ['chapter_log', 'feedback_seen_at', 'TEXT'],
  ['reward', 'note', 'TEXT'],
];

export function openDb(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  // WAL keeps every committed write on disk before the API answers, so it survives a restart.
  db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = OFF');
  const hasColumn = db.prepare('SELECT 1 FROM pragma_table_info(?) WHERE name = ?');
  const tableExists = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?");
  for (const [table, column, definition] of addedColumns) {
    if (tableExists.get(table) && !hasColumn.get(table, column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  if (tableExists.get('profile') && !hasColumn.get('profile', 'username')) replaceProfilesWithUsers(db);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  return db;
}

/**
 * The accounts release: everyone signs in with a username, the grown-up role is called parent, and
 * the PIN columns and the device table go. The role check on the old table forbids the new value, so
 * the table is rebuilt; ids are kept, so sessions and reset links still point at the right person.
 */
function replaceProfilesWithUsers(db: DatabaseSync) {
  db.exec(`BEGIN;
    CREATE TABLE profile_new (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL REFERENCES household(id),
      role TEXT NOT NULL CHECK (role IN ('reader','parent')),
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      username TEXT NOT NULL,
      email TEXT,
      password_hash TEXT
    );`);
  const rows = db.prepare('SELECT id, role, name, email FROM profile ORDER BY rowid').all() as { id: string; role: string; name: string; email: string | null }[];
  const taken = new Set<string>();
  const insert = db.prepare(
    "INSERT INTO profile_new (id, household_id, role, name, color, username, email, password_hash) SELECT id, household_id, ?, name, color, ?, lower(email), password_hash FROM profile WHERE id = ?",
  );
  for (const row of rows) {
    const base = (row.role === 'parent' && row.email ? row.email.split('@')[0] : row.name).toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 20).padEnd(3, '0');
    let username = base;
    for (let n = 2; taken.has(username); n++) username = `${base.slice(0, 18)}${n}`;
    taken.add(username);
    insert.run(row.role === 'parent' ? 'parent' : row.role, username, row.id);
  }
  db.exec(`DROP TABLE profile;
    ALTER TABLE profile_new RENAME TO profile;
    DROP TABLE IF EXISTS device;
    UPDATE book SET added_by_role = 'parent' WHERE added_by_role = 'parent';
    COMMIT;`);
}
