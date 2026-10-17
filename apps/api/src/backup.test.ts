// Traces to: L2-031
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openDb } from './db.ts';
import { runBackup } from './backup.ts';

const now = new Date('2026-10-17T08:15:00Z');

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'shelfie-backup-'));
  const dbPath = join(dir, 'shelfie.db');
  openDb(dbPath).close();
  return { dbPath, backupDir: join(dir, 'backups') };
}

test('Given a database, when the backup runs, then a dated copy exists that passes the integrity check', () => {
  const { dbPath, backupDir } = fixture();

  const file = runBackup({ dbPath, backupDir, now });

  assert.equal(file, join(backupDir, 'shelfie-2026-10-17.sqlite'));
  const copy = new DatabaseSync(file, { readOnly: true });
  assert.equal((copy.prepare('PRAGMA integrity_check').get() as { integrity_check: string }).integrity_check, 'ok');
  const source = new DatabaseSync(dbPath, { readOnly: true });
  const tables = (db: DatabaseSync) =>
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((row) => row.name);
  assert.deepEqual(tables(copy), tables(source));
  copy.close();
  source.close();
});

test('Given copies older than 30 days, when the backup runs, then they are deleted and newer ones kept', () => {
  const { dbPath, backupDir } = fixture();
  mkdirSync(backupDir, { recursive: true });
  writeFileSync(join(backupDir, 'shelfie-2026-09-01.sqlite'), '');
  writeFileSync(join(backupDir, 'shelfie-2026-10-01.sqlite'), '');

  runBackup({ dbPath, backupDir, now });

  assert.deepEqual(readdirSync(backupDir).sort(), ['shelfie-2026-10-01.sqlite', 'shelfie-2026-10-17.sqlite']);
});

test('Given a backup already made today, when the backup runs again, then it is replaced by a fresh copy', () => {
  const { dbPath, backupDir } = fixture();
  mkdirSync(backupDir, { recursive: true });
  writeFileSync(join(backupDir, 'shelfie-2026-10-17.sqlite'), 'stale');

  const file = runBackup({ dbPath, backupDir, now });

  const copy = new DatabaseSync(file, { readOnly: true });
  assert.equal((copy.prepare('PRAGMA integrity_check').get() as { integrity_check: string }).integrity_check, 'ok');
  copy.close();
});

test('Given the database file is missing, when the backup runs, then it fails and earlier copies are untouched', () => {
  const { dbPath, backupDir } = fixture();
  mkdirSync(backupDir, { recursive: true });
  writeFileSync(join(backupDir, 'shelfie-2026-10-01.sqlite'), '');

  assert.throws(() => runBackup({ dbPath: join(backupDir, '..', 'missing.db'), backupDir, now }));

  assert.deepEqual(readdirSync(backupDir), ['shelfie-2026-10-01.sqlite']);
  void dbPath;
});
