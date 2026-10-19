import type { Pool } from 'pg';
import { hashSecret } from '../../apps/api/src/secret.ts';

const THEO_PASSWORD = hashSecret('theo-reads-6');

let db: Pool;

/** Points these helpers at the database behind this worker's API. */
export function useDatabase(pool: Pool) {
  db = pool;
}

const rows = async <T>(sql: string, params: unknown[] = []) => (await db.query(sql, params)).rows as T[];

/** The day a chapter was read, as stored; undefined when the chapter is not logged. */
export async function readOnOf(bookId: string, chapter: number): Promise<string | undefined> {
  const [row] = await rows<{ read_on: string }>('SELECT read_on FROM chapter_log WHERE book_id = $1 AND chapter_number = $2', [bookId, chapter]);
  return row?.read_on;
}

/** Calendar day in the seeded household's time zone (UTC), `offset` days from today. */
export function householdDay(offset = 0): string {
  return new Date(Date.now() + offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Ages every session past its 30-day idle limit, as if nobody had touched the app for a month. */
export async function expireSessions() {
  await db.query("UPDATE session SET expires_at = '2020-01-01T00:00:00.000Z'");
}

/** Leaves every session one day from expiring. */
export async function shortenSessions() {
  await db.query('UPDATE session SET expires_at = $1', [new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()]);
}

/** When the newest session expires, as stored. */
export async function sessionExpiresAt(): Promise<string> {
  const [row] = await rows<{ expires_at: string }>('SELECT expires_at FROM session ORDER BY created_at DESC LIMIT 1');
  return row.expires_at;
}

/** Makes every reset link older than its hour. */
export async function expireResetLinks() {
  await db.query("UPDATE password_reset SET expires_at = '2020-01-01T00:00:00.000Z'");
}

/** Makes every invite link older than its 7 days. */
export async function expireInvites() {
  await db.query("UPDATE invites SET expires_at = '2020-01-01T00:00:00.000Z'");
}

/** The question texts stored with a logged chapter's answers, in order. */
export async function questionsAnswered(bookId: string, chapter: number): Promise<string[]> {
  const answers = await rows<{ question_text: string }>(
    'SELECT a.question_text FROM answer a JOIN chapter_log c ON c.id = a.chapter_log_id WHERE c.book_id = $1 AND c.chapter_number = $2 ORDER BY a.position',
    [bookId, chapter],
  );
  return answers.map((r) => r.question_text);
}

/** The answer texts stored with a logged chapter, in question order. */
export async function answersGiven(bookId: string, chapter: number): Promise<string[]> {
  const answers = await rows<{ text: string }>(
    'SELECT a.text FROM answer a JOIN chapter_log c ON c.id = a.chapter_log_id WHERE c.book_id = $1 AND c.chapter_number = $2 ORDER BY a.position',
    [bookId, chapter],
  );
  return answers.map((r) => r.text);
}

/** Rewrites when Nia's logged chapters were read so that they fall on exactly these days ago. */
export async function setReadingDays(daysAgo: number[]) {
  await db.query("UPDATE chapter_log SET read_on = '2000-01-01' WHERE book_id IN (SELECT id FROM book WHERE household_id = 'h1')");
  const ids = await rows<{ id: string }>("SELECT c.id FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE b.household_id = 'h1' ORDER BY c.id");
  for (const [i, ago] of daysAgo.entries()) {
    await db.query('UPDATE chapter_log SET read_on = $1 WHERE id = $2', [householdDay(-ago), ids[i].id]);
  }
}

/** Marks every chapter Nia has logged as reviewed by Dad. */
export async function reviewEverything() {
  await db.query("UPDATE chapter_log SET reviewed_at = logged_at, sticker = 'star' WHERE reviewed_at IS NULL");
}

/** Marks every chapter Nia has logged as still waiting for Dad. */
export async function unreviewEverything() {
  await db.query('UPDATE chapter_log SET reviewed_at = NULL, sticker = NULL, note = NULL, feedback_seen_at = NULL');
}

/** When a chapter reached the server, as stored; undefined when it has not. */
export async function loggedAtOf(bookId: string, chapter: number): Promise<string | undefined> {
  const [row] = await rows<{ logged_at: string }>('SELECT logged_at FROM chapter_log WHERE book_id = $1 AND chapter_number = $2', [bookId, chapter]);
  return row?.logged_at;
}

/** Puts a reward in the seeded household's gallery, as Dad would in Settings, and returns its id. */
export async function addGalleryReward(name: string, target: number, description = ''): Promise<string> {
  const id = `g-${name.toLowerCase().replace(/\W+/g, '-')}`;
  await db.query("INSERT INTO gallery_reward (id, household_id, name, target, description, created_at) VALUES ($1, 'h1', $2, $3, $4, $5)", [
    id,
    name,
    target,
    description,
    new Date().toISOString(),
  ]);
  return id;
}

/** Marks one of Nia's books finished now, as logging its last chapter does. */
export async function finishBook(bookId: string) {
  await db.query('UPDATE book SET finished_at = $1 WHERE id = $2', [new Date().toISOString(), bookId]);
}

/** Makes a gallery reward the seeded household's goal, picked a minute ago. */
export async function pickGoal(id: string) {
  await db.query('UPDATE gallery_reward SET picked_at = $1 WHERE id = $2', [new Date(Date.now() - 60_000).toISOString(), id]);
}

/** Sets a streak reward for the seeded household, as Dad would in Settings. */
export async function addStreakReward(milestone: number, name: string, amount: number | null = null) {
  await db.query("INSERT INTO streak_reward (household_id, milestone, name, amount) VALUES ('h1', $1, $2, $3)", [milestone, name, amount]);
}

/** Marks a streak reward as already earned and given, as Review's Give it does. */
export async function giveStreakRewardInDatabase(milestone: number) {
  const now = new Date().toISOString();
  await db.query("UPDATE streak_reward SET earned_at = $1, given_at = $1 WHERE household_id = 'h1' AND milestone = $2", [now, milestone]);
}

/** Every feedback row as stored, oldest first, with the sender's household and profile. */
export function storedFeedback() {
  return rows<{ household_id: string; profile_id: string; kind: string; score: number | null; message: string | null }>(
    'SELECT household_id, profile_id, kind, score, message FROM feedback ORDER BY created_at',
  );
}

/** The push subscriptions stored for a person, by username, oldest first. */
export async function pushDevicesOf(username: string): Promise<string[]> {
  const found = await rows<{ endpoint: string }>(
    'SELECT s.endpoint FROM push_subscription s JOIN profile p ON p.id = s.profile_id WHERE p.username = $1 ORDER BY s.created_at, s.id',
    [username],
  );
  return found.map((r) => r.endpoint);
}


/** Gives Nia a brother: Theo, a reader in her household who signs in as `theo`. */
export async function addTheo() {
  await db.query(
    "INSERT INTO profile (id, household_id, role, name, color, username, email, password_hash) VALUES ('p-theo', 'h1', 'reader', 'Theo', 'mint', 'theo', NULL, $1)",
    [THEO_PASSWORD],
  );
}

/** Starts a challenge in the seeded household as Dad would, running from `startsOn` to `endsOn`, and returns its id. */
export async function startChallengeInDatabase({
  name = 'Half-term reading race',
  measure = 'chapters',
  goal = 15,
  startsOn = householdDay(0),
  endsOn = householdDay(13),
  readerIds = ['p-nia', 'p-theo'],
  endedAt = null as string | null,
  createdAt = new Date().toISOString(),
} = {}) {
  const id = `c-${name.toLowerCase().replace(/\W+/g, '-')}`;
  await db.query(
    "INSERT INTO challenge (id, household_id, name, measure, goal, starts_on, ends_on, created_at, ended_at) VALUES ($1, 'h1', $2, $3, $4, $5, $6, $7, $8)",
    [id, name, measure, goal, startsOn, endsOn, createdAt, endedAt],
  );
  for (const readerId of readerIds) await db.query('INSERT INTO challenge_reader (challenge_id, profile_id) VALUES ($1, $2)', [id, readerId]);
  return id;
}

/** Logs `count` more chapters of The Wild Robot as a reader, reaching the server at `at` (now by default). */
export async function logChaptersAs(readerId: string, count: number, at = new Date().toISOString()) {
  const [{ latest }] = await rows<{ latest: number }>("SELECT COALESCE(MAX(chapter_number), 0)::int AS latest FROM chapter_log WHERE book_id = 'b-robot'");
  for (let n = latest + 1; n <= latest + count; n++) {
    await db.query("INSERT INTO chapter_log (id, book_id, chapter_number, read_on, logged_at, undo_until, reader_id) VALUES ($1, 'b-robot', $2, $3, $4, $4, $5)", [
      `b-robot-c${n}`,
      n,
      at.slice(0, 10),
      at,
      readerId,
    ]);
  }
}

/** Gives a challenge's winners a reward, as Dad's Give a reward does. */
export async function rewardChallengeInDatabase(id: string, text: string) {
  await db.query('UPDATE challenge SET reward_text = $1, rewarded_at = $2 WHERE id = $3', [text, new Date().toISOString(), id]);
}

/** Moves every chapter Nia's household has logged to long ago, so only the chapters a test logs fall inside a challenge. */
export async function forgetSeededLogs() {
  await db.query(
    "UPDATE chapter_log SET read_on = '2000-01-01', logged_at = '2000-01-01T12:00:00.000Z' WHERE book_id IN (SELECT id FROM book WHERE household_id = 'h1')",
  );
}

/** Stores a browser subscription for a person, as turning on "Notify this device" does. */
export async function addPushDevice(username: string, endpoint: string) {
  await db.query(
    "INSERT INTO push_subscription (id, profile_id, endpoint, p256dh, auth, created_at) SELECT $1, id, $2, 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', 'tBHItJI5svbpez7KI4CCXg', $3 FROM profile WHERE username = $4",
    [`ps-${username}`, endpoint, new Date().toISOString(), username],
  );
}
