import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { takenFields } from './auth.service.ts';
import { Problem } from './problem.ts';
import { hashSecret } from './secret.ts';
import type { ReaderView } from './settings.service.ts';

export interface ReaderInput {
  name: string;
  color: string;
  username: string;
  password?: string;
}

function readerView(db: DatabaseSync, id: string): ReaderView {
  return db.prepare('SELECT id, name, color, username FROM profile WHERE id = ?').get(id) as unknown as ReaderView;
}

/** Adds a reader to the household; the parent chooses her username and password. */
export function addReader(db: DatabaseSync, householdId: string, input: ReaderInput): ReaderView {
  if (takenFields(db, input.username, null).length) throw new Problem(409, 'username-taken');
  const id = randomUUID();
  db.prepare("INSERT INTO profile (id, household_id, role, name, color, username, email, password_hash) VALUES (?, ?, 'reader', ?, ?, ?, NULL, ?)").run(
    id,
    householdId,
    input.name.trim(),
    input.color,
    input.username,
    hashSecret(input.password!),
  );
  return readerView(db, id);
}

/** Changes a reader of the household; a new password ends her sessions so she uses it next time. */
export function updateReader(db: DatabaseSync, householdId: string, id: string, input: ReaderInput): ReaderView {
  const reader = db.prepare("SELECT id FROM profile WHERE id = ? AND household_id = ? AND role = 'reader'").get(id, householdId);
  if (!reader) throw new Problem(404, 'not-found');
  if (takenFields(db, input.username, null, id).length) throw new Problem(409, 'username-taken');
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE profile SET name = ?, color = ?, username = ? WHERE id = ?').run(input.name.trim(), input.color, input.username, id);
    if (input.password) {
      db.prepare('UPDATE profile SET password_hash = ? WHERE id = ?').run(hashSecret(input.password), id);
      db.prepare('DELETE FROM session WHERE profile_id = ?').run(id);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return readerView(db, id);
}
