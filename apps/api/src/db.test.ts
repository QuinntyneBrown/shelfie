// Traces to: L2-031
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openDb } from './db.ts';

test('Given the database file, then it is opened for durable writes with foreign keys enforced', () => {
  const db = openDb(join(mkdtempSync(join(tmpdir(), 'shelfie-')), 'shelfie.db'));
  assert.equal((db.prepare('PRAGMA journal_mode').get() as { journal_mode: string }).journal_mode, 'wal');
  assert.equal((db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number }).foreign_keys, 1);
  assert.equal((db.prepare('PRAGMA busy_timeout').get() as { timeout: number }).timeout, 5000);
});

test('Given a database created by the first release, when it is opened, then its tables gain the columns the API needs and the data is kept', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'shelfie-')), 'shelfie.db');
  const old = new DatabaseSync(path);
  old.exec(`
    CREATE TABLE household (id TEXT PRIMARY KEY, time_zone TEXT NOT NULL DEFAULT 'UTC');
    CREATE TABLE profile (id TEXT PRIMARY KEY, household_id TEXT NOT NULL REFERENCES household(id), role TEXT NOT NULL, name TEXT NOT NULL, color TEXT NOT NULL, pin_hash TEXT, pin_failed_count INTEGER NOT NULL DEFAULT 0, pin_locked_until TEXT);
    CREATE TABLE book (id TEXT PRIMARY KEY, household_id TEXT NOT NULL REFERENCES household(id), title TEXT NOT NULL, author TEXT, chapter_count INTEGER NOT NULL, cover_color TEXT NOT NULL, sticker TEXT NOT NULL, added_by_role TEXT NOT NULL DEFAULT 'grown_up', created_at TEXT NOT NULL, finished_at TEXT);
    CREATE TABLE chapter_log (id TEXT PRIMARY KEY, book_id TEXT NOT NULL REFERENCES book(id), chapter_number INTEGER NOT NULL, read_on TEXT NOT NULL, logged_at TEXT NOT NULL, undo_until TEXT NOT NULL, UNIQUE (book_id, chapter_number));
    CREATE TABLE reward (book_id TEXT PRIMARY KEY REFERENCES book(id), text TEXT NOT NULL, given_at TEXT NOT NULL);
    INSERT INTO household (id) VALUES ('h1');
    INSERT INTO profile (id, household_id, role, name, color) VALUES ('p1', 'h1', 'grown_up', 'Dad', 'blue');
    INSERT INTO book (id, household_id, title, chapter_count, cover_color, sticker, created_at) VALUES ('b1', 'h1', 'Matilda', 21, 'red', 'star', '2026-10-01');
    INSERT INTO chapter_log (id, book_id, chapter_number, read_on, logged_at, undo_until) VALUES ('c1', 'b1', 1, '2026-10-02', '2026-10-02', '2026-10-02');
  `);
  old.close();

  const db = openDb(path);
  const log = db.prepare('SELECT reviewed_at, sticker, note, feedback_seen_at FROM chapter_log WHERE id = ?').get('c1') as Record<string, unknown>;
  assert.deepEqual({ ...log }, { reviewed_at: null, sticker: null, note: null, feedback_seen_at: null });
  assert.equal((db.prepare('SELECT theme FROM household WHERE id = ?').get('h1') as { theme: string }).theme, 'device');
  assert.deepEqual({ ...db.prepare('SELECT email, password_hash FROM profile WHERE id = ?').get('p1') }, { email: null, password_hash: null });
  db.prepare('UPDATE profile SET email = ? WHERE id = ?').run('dad@example.com', 'p1');
  assert.throws(() => db.prepare("INSERT INTO profile (id, household_id, role, name, color, email) VALUES ('p2', 'h1', 'grown_up', 'Mum', 'green', 'dad@example.com')").run());
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM pragma_table_info('reward') WHERE name = 'note'").get() as { n: number }).n, 1);
});
