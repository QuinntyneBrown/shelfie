import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const RETENTION_DAYS = 30;
const BACKUP_NAME = /^shelfie-(\d{4}-\d{2}-\d{2})\.sqlite$/;

export interface BackupOptions {
  dbPath: string;
  backupDir: string;
  now: Date;
}

/** Copies the live database to <backupDir>/shelfie-YYYY-MM-DD.sqlite, verifies the copy and prunes copies older than 30 days. */
export function runBackup({ dbPath, backupDir, now }: BackupOptions): string {
  mkdirSync(backupDir, { recursive: true });
  const target = join(backupDir, `shelfie-${now.toISOString().slice(0, 10)}.sqlite`);
  const temp = `${target}.tmp`;
  rmSync(temp, { force: true });

  const source = new DatabaseSync(dbPath, { readOnly: true });
  try {
    source.prepare('VACUUM INTO ?').run(temp);
  } finally {
    source.close();
  }

  const copy = new DatabaseSync(temp, { readOnly: true });
  try {
    const { integrity_check } = copy.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
    if (integrity_check !== 'ok') throw new Error(`Backup copy failed its integrity check: ${integrity_check}`);
  } finally {
    copy.close();
  }

  renameSync(temp, target);
  prune(backupDir, now);
  return target;
}

function prune(backupDir: string, now: Date) {
  const cutoff = now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const name of readdirSync(backupDir)) {
    const match = BACKUP_NAME.exec(name);
    if (match && Date.parse(match[1]) < cutoff) rmSync(join(backupDir, name));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = runBackup({
    dbPath: process.env.SHELFIE_DB ?? 'shelfie.db',
    backupDir: process.env.SHELFIE_BACKUP_DIR ?? 'backups',
    now: new Date(),
  });
  console.log(`backup written to ${file}`);
}
