// Traces to: L2-031
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from './db.ts';

test('Given the database file, then it is opened for durable writes with foreign keys enforced', () => {
  const db = openDb(join(mkdtempSync(join(tmpdir(), 'shelfie-')), 'shelfie.db'));
  assert.equal((db.prepare('PRAGMA journal_mode').get() as { journal_mode: string }).journal_mode, 'wal');
  assert.equal((db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number }).foreign_keys, 1);
  assert.equal((db.prepare('PRAGMA busy_timeout').get() as { timeout: number }).timeout, 5000);
});
