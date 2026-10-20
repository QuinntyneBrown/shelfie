import type { Pool } from 'pg';

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

/** Makes every confirm-your-e-mail link older than its 24 hours. */
export async function expireVerifyLinks() {
  await db.query("UPDATE email_verification SET expires_at = '2020-01-01T00:00:00.000Z'");
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

