import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export function openDb(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  // WAL keeps every committed write on disk before the API answers, so it survives a restart.
  db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON');
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  return db;
}
