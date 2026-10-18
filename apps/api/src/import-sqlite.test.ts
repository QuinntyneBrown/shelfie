// Traces to: L2-038
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { all, get, run } from './db.ts';
import { importSqlite } from './import-sqlite.ts';
import { createTestDatabase } from './test-db.ts';

/** A database file as the SQLite release left it, with one household's worth of rows in every table. */
function sqliteRelease(): string {
  const path = join(mkdtempSync(join(tmpdir(), 'shelfie-import-')), 'shelfie.db');
  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE household (id TEXT PRIMARY KEY, time_zone TEXT NOT NULL DEFAULT 'UTC', theme TEXT NOT NULL DEFAULT 'device');
    CREATE TABLE profile (id TEXT PRIMARY KEY, household_id TEXT NOT NULL, role TEXT NOT NULL, name TEXT NOT NULL, color TEXT NOT NULL, username TEXT NOT NULL, email TEXT, password_hash TEXT);
    CREATE TABLE session (id TEXT PRIMARY KEY, profile_id TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, remember INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE book (id TEXT PRIMARY KEY, household_id TEXT NOT NULL, title TEXT NOT NULL, author TEXT, chapter_count INTEGER NOT NULL, cover_color TEXT NOT NULL, sticker TEXT NOT NULL, added_by_role TEXT NOT NULL DEFAULT 'parent', created_at TEXT NOT NULL, finished_at TEXT);
    CREATE TABLE chapter_log (id TEXT PRIMARY KEY, book_id TEXT NOT NULL, chapter_number INTEGER NOT NULL, read_on TEXT NOT NULL, logged_at TEXT NOT NULL, undo_until TEXT NOT NULL, reviewed_at TEXT, sticker TEXT, note TEXT, feedback_seen_at TEXT);
    CREATE TABLE reward (book_id TEXT PRIMARY KEY, text TEXT NOT NULL, note TEXT, given_at TEXT NOT NULL);
    CREATE TABLE answer (id TEXT PRIMARY KEY, chapter_log_id TEXT NOT NULL, position INTEGER NOT NULL, question_text TEXT NOT NULL, text TEXT NOT NULL);
    CREATE TABLE invites (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, household_id TEXT NOT NULL, invited_by TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT);
    CREATE TABLE password_reset (token_hash TEXT PRIMARY KEY, profile_id TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT);
    CREATE TABLE question (id TEXT PRIMARY KEY, book_id TEXT NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL, removed_at TEXT);
    CREATE TABLE sign_in_attempt (source TEXT NOT NULL, at TEXT NOT NULL);
    INSERT INTO household (id, time_zone, theme) VALUES ('h1', 'America/Toronto', 'dark');
    INSERT INTO profile (id, household_id, role, name, color, username, email, password_hash) VALUES
      ('p-nia', 'h1', 'reader', 'Nia', 'rose', 'nia', NULL, 'nia$hash'),
      ('p-dad', 'h1', 'parent', 'Dad', 'sky', 'dad', 'dad@example.com', 'pw$hash');
    INSERT INTO session (id, profile_id, created_at, expires_at, remember) VALUES ('s1', 'p-dad', '2026-10-01T00:00:00.000Z', '2026-10-31T00:00:00.000Z', 0);
    INSERT INTO book (id, household_id, title, author, chapter_count, cover_color, sticker, added_by_role, created_at, finished_at) VALUES
      ('b1', 'h1', 'Matilda', 'Roald Dahl', 2, 'rose', '📚', 'parent', '2026-10-01T09:00:00.000Z', '2026-10-03T16:00:00.000Z');
    INSERT INTO chapter_log (id, book_id, chapter_number, read_on, logged_at, undo_until, reviewed_at, sticker, note, feedback_seen_at) VALUES
      ('c1', 'b1', 1, '2026-10-02', '2026-10-02T16:00:00.000Z', '2026-10-02T16:00:10.000Z', '2026-10-02T18:00:00.000Z', 'star', 'Lovely <b>work</b>!', NULL),
      ('c2', 'b1', 2, '2026-10-03', '2026-10-03T16:00:00.000Z', '2026-10-03T16:00:10.000Z', NULL, NULL, NULL, NULL);
    INSERT INTO reward (book_id, text, note, given_at) VALUES ('b1', 'Movie night', NULL, '2026-10-04T18:00:00.000Z');
    INSERT INTO answer (id, chapter_log_id, position, question_text, text) VALUES ('a1', 'c1', 1, 'What happened?', 'Matilda read every book in the library.');
    INSERT INTO invites (token_hash, email, household_id, invited_by, expires_at, used_at) VALUES ('i1', 'mum@example.com', 'h1', 'p-dad', '2026-10-08T00:00:00.000Z', NULL);
    INSERT INTO password_reset (token_hash, profile_id, expires_at, used_at) VALUES ('t1', 'p-dad', '2026-10-01T01:00:00.000Z', '2026-10-01T00:30:00.000Z');
    INSERT INTO question (id, book_id, text, created_at, removed_at) VALUES ('q1', 'b1', 'Who is Miss Honey?', '2026-10-01T09:30:00.000Z', NULL);
    INSERT INTO sign_in_attempt (source, at) VALUES ('203.0.113.9', '2026-10-01T00:00:00.000Z');
  `);
  db.close();
  return path;
}

test('Given the SQLite database of the current release, when it is imported into an empty database, then every row is present with the same values', async () => {
  const db = await createTestDatabase();
  try {
    const counts = await importSqlite(sqliteRelease(), db.pool);

    assert.deepEqual(counts, { household: 1, profile: 2, session: 1, password_reset: 1, invites: 1, book: 1, chapter_log: 2, answer: 1, question: 1, reward: 1, sign_in_attempt: 1 });
    assert.deepEqual(await get(db.pool, 'SELECT id, time_zone, theme FROM household'), { id: 'h1', time_zone: 'America/Toronto', theme: 'dark' });
    assert.deepEqual(await get(db.pool, "SELECT username, email, password_hash FROM profile WHERE id = 'p-dad'"), { username: 'dad', email: 'dad@example.com', password_hash: 'pw$hash' });
    assert.deepEqual(await get(db.pool, 'SELECT email, invited_by FROM invites'), { email: 'mum@example.com', invited_by: 'p-dad' });
    assert.deepEqual(await get(db.pool, "SELECT reviewed_at, sticker, note FROM chapter_log WHERE id = 'c1'"), { reviewed_at: '2026-10-02T18:00:00.000Z', sticker: 'star', note: 'Lovely <b>work</b>!' });
    assert.deepEqual(await get(db.pool, "SELECT text FROM answer WHERE id = 'a1'"), { text: 'Matilda read every book in the library.' });
    assert.deepEqual(await get(db.pool, 'SELECT used_at FROM password_reset'), { used_at: '2026-10-01T00:30:00.000Z' });
    assert.deepEqual(await all(db.pool, 'SELECT source, at FROM sign_in_attempt'), [{ source: '203.0.113.9', at: '2026-10-01T00:00:00.000Z' }]);
  } finally {
    await db.drop();
  }
});

test('Given a database that already holds a household, when an import is attempted, then it is refused and nothing is written', async () => {
  const db = await createTestDatabase();
  try {
    await run(db.pool, "INSERT INTO household (id) VALUES ('existing')");

    await assert.rejects(importSqlite(sqliteRelease(), db.pool), /already holds/);

    assert.deepEqual(await all(db.pool, 'SELECT id FROM household'), [{ id: 'existing' }]);
    assert.deepEqual(await all(db.pool, 'SELECT id FROM book'), []);
  } finally {
    await db.drop();
  }
});
