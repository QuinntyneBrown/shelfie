import { randomUUID } from 'node:crypto';
import { all, get, run, type Db } from './db.ts';
import { PHOTO_COLUMN } from './photos.service.ts';
import { Problem } from './problem.ts';
import { todayIn } from './streak.ts';

export const KINDS = ['read-to', 'helped', 'read-to-me'] as const;
/** How many sessions one reader can log on one household day (L2-137). */
export const DAILY_LIMIT = 10;

export interface Reader {
  id: string;
  name: string;
  color: string;
  photo: string | null;
}

/** A session told the same way to everyone: the helper first, and what she did (L2-138). */
export interface Session {
  id: string;
  helper: Reader;
  other: Reader;
  action: 'read-to' | 'helped';
  minutes: number;
  readOn: string;
  loggedById: string;
  confirmed: boolean;
}

export interface SessionInput {
  partnerId: string;
  kind: (typeof KINDS)[number];
  minutes: number;
  readOn: string;
}

/** SQL for the helper of a session: the one who logged it, unless she was read to. */
export const HELPER_COLUMN = "CASE WHEN s.kind = 'read-to-me' THEN s.partner_id ELSE s.logged_by END";

const readerColumns = (alias: string) =>
  `${alias}.id, ${alias}.name, ${alias}.color, CASE WHEN ${alias}p.etag IS NULL THEN NULL ELSE '/api/photos/' || ${alias}.id || '?v=' || ${alias}p.etag END AS photo`;

interface Row {
  id: string;
  kind: string;
  minutes: number;
  read_on: string;
  logged_by: string;
  confirmed_at: string | null;
  helper: Reader;
  other: Reader;
}

const SESSION_SELECT = `
  SELECT s.id, s.kind, s.minutes, s.read_on, s.logged_by, s.confirmed_at,
         (SELECT row_to_json(r) FROM (SELECT ${readerColumns('h')} FROM profile h LEFT JOIN profile_photo hp ON hp.profile_id = h.id WHERE h.id = ${HELPER_COLUMN}) r) AS helper,
         (SELECT row_to_json(r) FROM (SELECT ${readerColumns('o')} FROM profile o LEFT JOIN profile_photo op ON op.profile_id = o.id
            WHERE o.id = CASE WHEN s.kind = 'read-to-me' THEN s.logged_by ELSE s.partner_id END) r) AS other
    FROM reading_session s`;

const toSession = (r: Row): Session => ({
  id: r.id,
  helper: r.helper,
  other: r.other,
  action: r.kind === 'helped' ? 'helped' : 'read-to',
  minutes: r.minutes,
  readOn: r.read_on,
  loggedById: r.logged_by,
  confirmed: r.confirmed_at !== null,
});

async function householdToday(db: Db, householdId: string) {
  const { time_zone } = (await get<{ time_zone: string }>(db, 'SELECT time_zone FROM household WHERE id = $1', [householdId]))!;
  return { timeZone: time_zone, today: todayIn(time_zone, new Date()) };
}

export async function today(db: Db, householdId: string) {
  return (await householdToday(db, householdId)).today;
}

/** The household's readers other than this profile, by name. */
export function partnersOf(db: Db, householdId: string, profileId: string): Promise<Reader[]> {
  return all<Reader>(
    db,
    `SELECT p.id, p.name, p.color, ${PHOTO_COLUMN} FROM profile p LEFT JOIN profile_photo pp ON pp.profile_id = p.id
      WHERE p.household_id = $1 AND p.role = 'reader' AND p.id <> $2 ORDER BY p.name, p.id`,
    [householdId, profileId],
  );
}

/** The newest sessions the profile is part of, removed ones left out. */
export async function sessionsOf(db: Db, householdId: string, profileId: string, limit = 5): Promise<Session[]> {
  const rows = await all<Row>(
    db,
    `${SESSION_SELECT} WHERE s.household_id = $1 AND s.removed_at IS NULL AND $2 IN (s.logged_by, s.partner_id)
      ORDER BY s.logged_at DESC, s.id LIMIT $3`,
    [householdId, profileId, limit],
  );
  return rows.map(toSession);
}

async function sessionById(db: Db, id: string): Promise<Session> {
  return toSession((await get<Row>(db, `${SESSION_SELECT} WHERE s.id = $1`, [id]))!);
}

/** Logs a session for a reader with another reader of her household, within the day's limit (L2-137). */
export async function logSession(db: Db, householdId: string, profileId: string, input: SessionInput): Promise<Session> {
  const partner = await get(db, "SELECT id FROM profile WHERE id = $1 AND household_id = $2 AND role = 'reader' AND id <> $3", [input.partnerId, householdId, profileId]);
  if (!partner) throw new Problem(404, 'not-found');
  const { timeZone, today } = await householdToday(db, householdId);
  if (input.readOn > today) throw new Problem(400, 'future-date');
  const { count } = (await get<{ count: number }>(
    db,
    `SELECT COUNT(*) AS count FROM reading_session
      WHERE logged_by = $1 AND removed_at IS NULL AND to_char(logged_at::timestamptz AT TIME ZONE $2, 'YYYY-MM-DD') = $3`,
    [profileId, timeZone, today],
  ))!;
  if (count >= DAILY_LIMIT) throw new Problem(409, 'too-many-sessions');
  const id = randomUUID();
  await run(
    db,
    'INSERT INTO reading_session (id, household_id, logged_by, partner_id, kind, minutes, read_on, logged_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [id, householdId, profileId, input.partnerId, input.kind, input.minutes, input.readOn, new Date().toISOString()],
  );
  return sessionById(db, id);
}
