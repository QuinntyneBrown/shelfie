import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { all, get, run, transaction, type Db } from './db.ts';
import { takenFields } from './auth.service.ts';
import { PHOTO_COLUMN } from './photos.service.ts';
import { Problem } from './problem.ts';
import { hashSecret } from './secret.ts';
import type { RequestSession } from './session.ts';
import type { ReaderView } from './settings.service.ts';

export interface ReaderInput {
  name: string;
  color: string;
  username: string;
  password?: string;
}

async function readerView(db: Db, id: string): Promise<ReaderView> {
  return (await get<ReaderView>(db, `SELECT p.id, p.name, p.color, p.username, ${PHOTO_COLUMN} FROM profile p LEFT JOIN profile_photo pp ON pp.profile_id = p.id WHERE p.id = $1`, [id]))!;
}

/** Adds a reader to the household; the parent chooses her username and password. */
export async function addReader(db: Pool, householdId: string, input: ReaderInput): Promise<ReaderView> {
  if ((await takenFields(db, input.username, null)).length) throw new Problem(409, 'username-taken');
  const id = randomUUID();
  await run(db, "INSERT INTO profile (id, household_id, role, name, color, username, email, password_hash) VALUES ($1, $2, 'reader', $3, $4, $5, NULL, $6)", [
    id,
    householdId,
    input.name.trim(),
    input.color,
    input.username,
    hashSecret(input.password!),
  ]);
  // Books stored while the household had no reader become the first reader's (ADR-0018).
  await run(db, 'UPDATE book SET reader_id = first_reader(household_id) WHERE household_id = $1 AND reader_id IS NULL', [householdId]);
  return readerView(db, id);
}

/** Changes a reader of the household; a new password ends her sessions so she uses it next time. */
export async function updateReader(pool: Pool, householdId: string, id: string, input: ReaderInput): Promise<ReaderView> {
  const reader = await get(pool, "SELECT id FROM profile WHERE id = $1 AND household_id = $2 AND role = 'reader'", [id, householdId]);
  if (!reader) throw new Problem(404, 'not-found');
  if ((await takenFields(pool, input.username, null, id)).length) throw new Problem(409, 'username-taken');
  await transaction(pool, async (db) => {
    await run(db, 'UPDATE profile SET name = $1, color = $2, username = $3 WHERE id = $4', [input.name.trim(), input.color, input.username, id]);
    if (input.password) {
      await run(db, 'UPDATE profile SET password_hash = $1 WHERE id = $2', [hashSecret(input.password), id]);
      await run(db, 'DELETE FROM session WHERE profile_id = $1', [id]);
    }
  });
  return readerView(pool, id);
}

/** A reader as parent pages label her: name, avatar colour and photo. */
export interface ReaderLabel {
  id: string;
  name: string;
  color: string;
  photo: string | null;
}

/** The household's readers, first reader first (by name, then id), as `first_reader()` orders them. */
export function householdReaders(db: Db, householdId: string): Promise<ReaderLabel[]> {
  return all<ReaderLabel>(
    db,
    `SELECT p.id, p.name, p.color, ${PHOTO_COLUMN} FROM profile p LEFT JOIN profile_photo pp ON pp.profile_id = p.id
      WHERE p.household_id = $1 AND p.role = 'reader' ORDER BY p.name, p.id`,
    [householdId],
  );
}

/**
 * The reader a request is about (ADR-0019): a reader is always herself; a parent gets the reader she asked for, which
 * must be a reader of her household (404 otherwise), or else the first reader, or null in a household with none.
 */
export async function readerFor(db: Db, session: RequestSession, requested?: unknown): Promise<string | null> {
  if (session.role === 'reader') return session.profileId;
  if (typeof requested === 'string' && requested !== '') {
    const reader = await get(db, "SELECT 1 FROM profile WHERE id = $1 AND household_id = $2 AND role = 'reader'", [requested, session.householdId]);
    if (!reader) throw new Problem(404, 'not-found');
    return requested;
  }
  return (await get<{ id: string | null }>(db, 'SELECT first_reader($1) AS id', [session.householdId]))!.id;
}

/** Limits book-level reads and writes to a reader's own books; a parent reaches every reader's (ADR-0018). */
export const onlyReader = (session: RequestSession): string | null => (session.role === 'reader' ? session.profileId : null);
