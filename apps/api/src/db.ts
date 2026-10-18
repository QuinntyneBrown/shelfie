import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

// Columns added to tables after the first release. schema.sql only creates tables that are missing,
// so an existing database gets each of these through ALTER TABLE before the schema runs.
const addedColumns: [table: string, column: string, definition: string][] = [
  ['household', 'theme', "TEXT NOT NULL DEFAULT 'device' CHECK (theme IN ('device','light','dark'))"],
  ['profile', 'email', 'TEXT'],
  ['profile', 'password_hash', 'TEXT'],
  ['chapter_log', 'reviewed_at', 'TEXT'],
  ['chapter_log', 'sticker', 'TEXT'],
  ['chapter_log', 'note', 'TEXT'],
  ['chapter_log', 'feedback_seen_at', 'TEXT'],
  ['reward', 'note', 'TEXT'],
];

export function openDb(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  // WAL keeps every committed write on disk before the API answers, so it survives a restart.
  db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON');
  const hasColumn = db.prepare('SELECT 1 FROM pragma_table_info(?) WHERE name = ?');
  const tableExists = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?");
  for (const [table, column, definition] of addedColumns) {
    if (tableExists.get(table) && !hasColumn.get(table, column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  return db;
}
