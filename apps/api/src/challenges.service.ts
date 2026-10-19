import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { all, get, transaction, type Db } from './db.ts';
import { PHOTO_COLUMN } from './photos.service.ts';
import { Problem } from './problem.ts';
import { computeStreak, todayIn } from './streak.ts';

const UNIQUE_VIOLATION = '23505';

export type Measure = 'chapters' | 'books';
export type Length = 'week' | 'two-weeks' | 'month';

/** The last day of a challenge, counted from its first (both included). */
const LENGTH_DAYS: Record<Length, number> = { week: 6, 'two-weeks': 13, month: 29 };

export interface ChallengeInput {
  name: string;
  measure: Measure;
  goal: number;
  length: Length;
  readerIds: string[];
}

export interface Standing {
  readerId: string;
  name: string;
  color: string;
  photo: string | null;
  count: number;
  rank: number;
  leading: boolean;
}

/** Three short lines for the parent; each is null when it has nothing to say (L2-141). */
export interface Insights {
  topReader: { name: string; count: number } | null;
  climber: { name: string; gain: number } | null;
  streak: { name: string; days: number } | null;
}

export interface Challenge {
  id: string;
  name: string;
  measure: Measure;
  goal: number;
  startsOn: string;
  endsOn: string;
  daysLeft: number;
  ended: boolean;
  standings: Standing[];
  /** The readers who won, once it has ended. */
  winners: string[];
  reward: { text: string; note: string | null } | null;
  /** Only while the challenge runs. */
  insights: Insights | null;
}

export interface Reader {
  id: string;
  name: string;
  color: string;
  photo: string | null;
}

export interface ChallengesView {
  today: string;
  readers: Reader[];
  current: Challenge | null;
  past: Challenge[];
}

interface ChallengeRow {
  id: string;
  name: string;
  measure: Measure;
  goal: number;
  starts_on: string;
  ends_on: string;
  ended_at: string | null;
  reward_text: string | null;
  reward_note: string | null;
}

const CHALLENGE_COLUMNS = 'id, name, measure, goal, starts_on, ends_on, ended_at, reward_text, reward_note';

const addDays = (isoDay: string, days: number) => {
  const date = new Date(`${isoDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

const timeZoneOf = async (db: Db, householdId: string) =>
  (await get<{ time_zone: string }>(db, 'SELECT time_zone FROM household WHERE id = $1', [householdId]))!.time_zone;

/**
 * What each reader taking part counted inside the window, by the day it reached the server in the household's time zone,
 * and before the moment the challenge was ended early (L2-139). A book counts for whoever logged its last chapter.
 */
function countedSql(measure: Measure) {
  return measure === 'chapters'
    ? `SELECT c.reader_id, COUNT(*) AS count
         FROM chapter_log c JOIN book b ON b.id = c.book_id
        WHERE b.household_id = $1 AND to_char(c.logged_at::timestamptz AT TIME ZONE $2, 'YYYY-MM-DD') BETWEEN $3 AND $4
          AND ($5::text IS NULL OR c.logged_at <= $5)
        GROUP BY c.reader_id`
    : `SELECT c.reader_id, COUNT(*) AS count
         FROM book b JOIN chapter_log c ON c.book_id = b.id AND c.chapter_number = b.chapter_count
        WHERE b.household_id = $1 AND b.finished_at IS NOT NULL
          AND to_char(b.finished_at::timestamptz AT TIME ZONE $2, 'YYYY-MM-DD') BETWEEN $3 AND $4
          AND ($5::text IS NULL OR b.finished_at <= $5)
        GROUP BY c.reader_id`;
}

/** The readers taking part, highest count first then by name; equal counts share a rank, and rank 1 above 0 leads (L2-140). */
async function standingsOf(db: Db, householdId: string, timeZone: string, row: ChallengeRow): Promise<Standing[]> {
  const rows = await all<Omit<Standing, 'rank' | 'leading'>>(
    db,
    `SELECT p.id AS "readerId", p.name, p.color, ${PHOTO_COLUMN}, COALESCE(n.count, 0)::int AS count
       FROM challenge_reader cr JOIN profile p ON p.id = cr.profile_id LEFT JOIN profile_photo pp ON pp.profile_id = p.id
       LEFT JOIN (${countedSql(row.measure)}) n ON n.reader_id = p.id
      WHERE cr.challenge_id = $6
      ORDER BY count DESC, p.name`,
    [householdId, timeZone, row.starts_on, row.ends_on, row.ended_at, row.id],
  );
  return rows.map((reader) => {
    const rank = 1 + rows.filter((other) => other.count > reader.count).length;
    return { ...reader, rank, leading: rank === 1 && reader.count > 0 };
  });
}

/**
 * The week's top reader, the biggest climber since the week before and the longest streak among the readers taking part,
 * from the days they say they read (as the streak and This week count), not when the log arrived.
 */
async function insightsOf(db: Db, householdId: string, today: string, standings: Standing[]): Promise<Insights> {
  const days = await all<{ reader_id: string; read_on: string }>(
    db,
    'SELECT c.reader_id, c.read_on FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE b.household_id = $1 AND c.reader_id = ANY($2)',
    [householdId, standings.map((s) => s.readerId)],
  );
  const weekStart = addDays(today, -6);
  const lastWeekStart = addDays(today, -13);
  const readers = [...standings]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ readerId, name }) => {
      const mine = days.filter((d) => d.reader_id === readerId).map((d) => d.read_on);
      const thisWeek = mine.filter((d) => d >= weekStart && d <= today).length;
      const lastWeek = mine.filter((d) => d >= lastWeekStart && d < weekStart).length;
      return { name, thisWeek, gain: thisWeek - lastWeek, streak: computeStreak(mine, today) };
    });
  type Line = (typeof readers)[number];
  const most = (key: 'thisWeek' | 'gain' | 'streak') => readers.reduce<Line | null>((best, r) => (r[key] > 0 && (!best || r[key] > best[key]) ? r : best), null);
  const top = most('thisWeek');
  const climber = most('gain');
  const streak = most('streak');
  return {
    topReader: top && { name: top.name, count: top.thisWeek },
    climber: climber && { name: climber.name, gain: climber.gain },
    streak: streak && { name: streak.name, days: streak.streak },
  };
}

/** The leaders of an ended challenge; a reader alone wins only by reaching the goal (L2-142). */
function winnersOf(row: ChallengeRow, standings: Standing[]) {
  if (row.ended_at === null) return [];
  if (standings.length === 1) return standings[0]!.count >= row.goal ? [standings[0]!.readerId] : [];
  return standings.filter((s) => s.leading).map((s) => s.readerId);
}

async function challengeOf(db: Db, householdId: string, timeZone: string, today: string, row: ChallengeRow): Promise<Challenge> {
  const standings = await standingsOf(db, householdId, timeZone, row);
  return {
    id: row.id,
    name: row.name,
    measure: row.measure,
    goal: row.goal,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    daysLeft: Math.max(0, daysBetween(today, row.ends_on)),
    ended: row.ended_at !== null,
    standings,
    winners: winnersOf(row, standings),
    reward: row.reward_text === null ? null : { text: row.reward_text, note: row.reward_note },
    insights: row.ended_at === null ? await insightsOf(db, householdId, today, standings) : null,
  };
}

/** The household's readers, the newest challenge and the ended ones before it (L2-140, L2-143). */
export async function challengesOf(db: Db, householdId: string, now = new Date()): Promise<ChallengesView> {
  const timeZone = await timeZoneOf(db, householdId);
  const today = todayIn(timeZone, now);
  const rows = await all<ChallengeRow>(db, `SELECT ${CHALLENGE_COLUMNS} FROM challenge WHERE household_id = $1 ORDER BY created_at DESC, id`, [householdId]);
  const challenges = await Promise.all(rows.map((row) => challengeOf(db, householdId, timeZone, today, row)));
  const readers = await all<Reader>(
    db,
    `SELECT p.id, p.name, p.color, ${PHOTO_COLUMN} FROM profile p LEFT JOIN profile_photo pp ON pp.profile_id = p.id
      WHERE p.household_id = $1 AND p.role = 'reader' ORDER BY p.name`,
    [householdId],
  );
  return { today, readers, current: challenges[0] ?? null, past: challenges.slice(1) };
}

/** Starts a challenge today for readers of the household; a second open one is refused (L2-137, L2-138). */
export async function createChallenge(pool: Pool, householdId: string, input: ChallengeInput, now = new Date()): Promise<Challenge> {
  const timeZone = await timeZoneOf(pool, householdId);
  const today = todayIn(timeZone, now);
  const known = await all<{ id: string }>(pool, "SELECT id FROM profile WHERE household_id = $1 AND role = 'reader' AND id = ANY($2)", [householdId, input.readerIds]);
  if (known.length !== input.readerIds.length) {
    throw new Problem(400, 'validation', { errors: [{ field: 'readerIds', message: 'Pick readers of this household' }] });
  }
  const row: ChallengeRow = {
    id: randomUUID(),
    name: input.name,
    measure: input.measure,
    goal: input.goal,
    starts_on: today,
    ends_on: addDays(today, LENGTH_DAYS[input.length]),
    ended_at: null,
    reward_text: null,
    reward_note: null,
  };
  try {
    await transaction(pool, async (db) => {
      await db.query('INSERT INTO challenge (id, household_id, name, measure, goal, starts_on, ends_on, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [
        row.id,
        householdId,
        row.name,
        row.measure,
        row.goal,
        row.starts_on,
        row.ends_on,
        now.toISOString(),
      ]);
      for (const readerId of input.readerIds) {
        await db.query('INSERT INTO challenge_reader (challenge_id, profile_id) VALUES ($1, $2)', [row.id, readerId]);
      }
    });
  } catch (e) {
    if ((e as { code?: string }).code === UNIQUE_VIOLATION) throw new Problem(409, 'challenge-running');
    throw e;
  }
  return challengeOf(pool, householdId, timeZone, today, row);
}

/** Ends every open challenge whose last day has passed, once, and returns their ids (ADR-0018). */
export async function closeExpired(db: Db, householdId: string, now = new Date()): Promise<string[]> {
  const today = todayIn(await timeZoneOf(db, householdId), now);
  const closed = await all<{ id: string }>(
    db,
    'UPDATE challenge SET ended_at = $1 WHERE household_id = $2 AND ended_at IS NULL AND ends_on < $3 RETURNING id',
    [now.toISOString(), householdId, today],
  );
  return closed.map((c) => c.id);
}

async function rowOf(db: Db, householdId: string, id: string): Promise<ChallengeRow> {
  const row = await get<ChallengeRow>(db, `SELECT ${CHALLENGE_COLUMNS} FROM challenge WHERE id = $1 AND household_id = $2`, [id, householdId]);
  if (!row) throw new Problem(404, 'not-found');
  return row;
}

async function viewOf(db: Db, householdId: string, id: string, now: Date) {
  const timeZone = await timeZoneOf(db, householdId);
  return challengeOf(db, householdId, timeZone, todayIn(timeZone, now), await rowOf(db, householdId, id));
}

/** Ends a running challenge now: today becomes its last day and nothing logged after this moment counts (L2-142). */
export async function endChallenge(db: Db, householdId: string, id: string, now = new Date()): Promise<Challenge> {
  await rowOf(db, householdId, id);
  const today = todayIn(await timeZoneOf(db, householdId), now);
  const changed = await all(db, 'UPDATE challenge SET ended_at = $1, ends_on = $2 WHERE id = $3 AND ended_at IS NULL RETURNING id', [now.toISOString(), today, id]);
  if (!changed.length) throw new Problem(409, 'challenge-ended');
  return viewOf(db, householdId, id, now);
}

/** Gives the winners of an ended challenge their reward, once (L2-142). */
export async function rewardChallenge(db: Db, householdId: string, id: string, text: string, note: string | null, now = new Date()): Promise<Challenge> {
  const challenge = await viewOf(db, householdId, id, now);
  if (!challenge.ended) throw new Problem(409, 'challenge-running');
  if (!challenge.winners.length) throw new Problem(409, 'no-winner');
  const changed = await all(
    db,
    'UPDATE challenge SET reward_text = $1, reward_note = $2, rewarded_at = $3 WHERE id = $4 AND rewarded_at IS NULL RETURNING id',
    [text, note, now.toISOString(), id],
  );
  if (!changed.length) throw new Problem(409, 'reward-exists');
  return { ...challenge, reward: { text, note } };
}

/** Removes a challenge, its readers and its reward; chapters and books are untouched (L2-142, L2-143). */
export async function removeChallenge(db: Db, householdId: string, id: string): Promise<void> {
  const removed = await all(db, 'DELETE FROM challenge WHERE id = $1 AND household_id = $2 RETURNING id', [id, householdId]);
  if (!removed.length) throw new Problem(404, 'not-found');
}
