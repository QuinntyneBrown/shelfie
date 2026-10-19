import { COVER_IMAGE_COLUMN } from './covers.service.ts';
import { all, get, run, type Db } from './db.ts';
import { goalOf, type Goal } from './gallery.service.ts';
import { Problem } from './problem.ts';
import { badgesFor, type Badge } from './badges.ts';
import { streakFor } from './streak.ts';
import { streakRewardsOf, type StreakReward } from './streak-rewards.service.ts';
import { helperRewardOf, type HelperReward } from './helper-reward.service.ts';
import { recentSessions } from './together.service.ts';

export interface QueueItem {
  chapterLogId: string;
  bookId: string;
  bookTitle: string;
  coverColor: string;
  coverSticker: string;
  coverImage: string | null;
  chapterNumber: number;
  readOn: string;
}

export interface FinishedBook {
  bookId: string;
  title: string;
  coverColor: string;
  coverSticker: string;
  coverImage: string | null;
  chapterCount: number;
  finishedOn: string;
}

export interface ActivityItem {
  kind: 'chapter-logged' | 'book-added' | 'sticker-given' | 'book-finished' | 'read-together';
  at: string;
  bookId: string | null;
  bookTitle: string | null;
  chapterNumber: number | null;
  sticker: string | null;
  byRole: 'reader' | 'parent';
  /** A reading-together session's own fields; null on every other kind (L2-143). */
  sessionId: string | null;
  helperName: string | null;
  otherName: string | null;
  action: 'read-to' | 'helped' | null;
  minutes: number | null;
}

const ACTIVITY_LIMIT = 20;

/** Book and chapter events and reading-together sessions, newest first. */
async function recentActivity(db: Db, householdId: string): Promise<ActivityItem[]> {
  const sessions: ActivityItem[] = (await recentSessions(db, householdId, ACTIVITY_LIMIT)).map((s) => ({
    kind: 'read-together',
    at: s.loggedAt,
    bookId: null,
    bookTitle: null,
    chapterNumber: null,
    sticker: null,
    byRole: 'reader',
    sessionId: s.id,
    helperName: s.helper.name,
    otherName: s.other.name,
    action: s.action,
    minutes: s.minutes,
  }));
  const none = { sessionId: null, helperName: null, otherName: null, action: null, minutes: null };
  const books = (await bookActivity(db, householdId)).map((item) => ({ ...item, ...none }));
  return [...books, ...sessions].sort((a, b) => b.at.localeCompare(a.at) || a.kind.localeCompare(b.kind)).slice(0, ACTIVITY_LIMIT);
}

function bookActivity(db: Db, householdId: string) {
  return all<Omit<ActivityItem, 'sessionId' | 'helperName' | 'otherName' | 'action' | 'minutes'>>(
    db,
    `SELECT * FROM (
       SELECT 'chapter-logged' AS kind, c.logged_at AS "at", b.id AS "bookId", b.title AS "bookTitle", c.chapter_number AS "chapterNumber", NULL::text AS sticker, 'reader' AS "byRole"
         FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE b.household_id = $1
       UNION ALL
       SELECT 'sticker-given', c.reviewed_at, b.id, b.title, c.chapter_number, c.sticker, 'parent'
         FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE b.household_id = $1 AND c.reviewed_at IS NOT NULL
       UNION ALL
       SELECT 'book-added', b.created_at, b.id, b.title, NULL, NULL, b.added_by_role FROM book b WHERE b.household_id = $1
       UNION ALL
       SELECT 'book-finished', b.finished_at, b.id, b.title, NULL, NULL, 'reader' FROM book b WHERE b.household_id = $1 AND b.finished_at IS NOT NULL
     ) activity ORDER BY "at" DESC, kind LIMIT $2`,
    [householdId, ACTIVITY_LIMIT],
  );
}

export interface ReviewOverview {
  activity: ActivityItem[];
  readerName: string;
  today: string;
  queue: QueueItem[];
  finishedUnrewarded: FinishedBook[];
  /** The reward gallery goal, so the book that reached it can say so. */
  goal: Goal | null;
  thisWeek: { chapters: number; streak: number };
  badges: Badge[];
  streakRewards: StreakReward[];
  helperReward: HelperReward | null;
}

export function pendingChapterLogs(db: Db, householdId: string): Promise<QueueItem[]> {
  return all<QueueItem>(
    db,
    `SELECT c.id AS "chapterLogId", b.id AS "bookId", b.title AS "bookTitle", b.cover_color AS "coverColor", b.sticker AS "coverSticker",
            ${COVER_IMAGE_COLUMN} AS "coverImage", c.chapter_number AS "chapterNumber", c.read_on AS "readOn"
       FROM chapter_log c JOIN book b ON b.id = c.book_id LEFT JOIN book_cover bc ON bc.book_id = b.id
      WHERE b.household_id = $1 AND c.reviewed_at IS NULL
      ORDER BY c.logged_at DESC, c.chapter_number DESC`,
    [householdId],
  );
}

export async function overview(db: Db, householdId: string, now = new Date()): Promise<ReviewOverview> {
  const { time_zone } = (await get<{ time_zone: string }>(db, 'SELECT time_zone FROM household WHERE id = $1', [householdId]))!;
  const dayOf = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: time_zone }).format(date);
  const reader = await get<{ name: string }>(db, "SELECT name FROM profile WHERE household_id = $1 AND role = 'reader' ORDER BY name", [householdId]);
  const finished = await all<Omit<FinishedBook, 'finishedOn'> & { finished_at: string }>(
    db,
    `SELECT b.id AS "bookId", b.title, b.cover_color AS "coverColor", b.sticker AS "coverSticker", ${COVER_IMAGE_COLUMN} AS "coverImage",
            b.chapter_count AS "chapterCount", b.finished_at
       FROM book b LEFT JOIN reward r ON r.book_id = b.id LEFT JOIN book_cover bc ON bc.book_id = b.id
      WHERE b.household_id = $1 AND b.finished_at IS NOT NULL AND r.book_id IS NULL
      ORDER BY b.finished_at DESC`,
    [householdId],
  );
  const weekStart = new Date(`${dayOf(now)}T00:00:00Z`);
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  const { chapters } = (await get<{ chapters: number }>(
    db,
    'SELECT COUNT(*) AS chapters FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE b.household_id = $1 AND c.read_on >= $2',
    [householdId, weekStart.toISOString().slice(0, 10)],
  ))!;
  return {
    activity: await recentActivity(db, householdId),
    readerName: reader?.name ?? 'your reader',
    thisWeek: { chapters, streak: await streakFor(db, householdId, now) },
    badges: await badgesFor(db, householdId),
    streakRewards: await streakRewardsOf(db, householdId, now),
    helperReward: await helperRewardOf(db, householdId),
    today: dayOf(now),
    queue: await pendingChapterLogs(db, householdId),
    finishedUnrewarded: finished.map(({ finished_at, ...book }) => ({ ...book, finishedOn: dayOf(new Date(finished_at)) })),
    goal: await goalOf(db, householdId),
  };
}

export const FEEDBACK_STICKERS = ['star', 'wise-owl', 'rocket', 'dragon', 'cookie', 'bright-idea'] as const;

/** Records Dad's sticker and note; a chapter is reviewed once, even if two sends race. */
export async function sendFeedback(db: Db, householdId: string, chapterLogId: string, sticker: string, note: string | null) {
  const log = await get<{ id: string; reviewed_at: string | null }>(
    db,
    'SELECT c.id, c.reviewed_at FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE c.id = $1 AND b.household_id = $2',
    [chapterLogId, householdId],
  );
  if (!log) throw new Problem(404, 'not-found');
  const changed = await run(db, 'UPDATE chapter_log SET reviewed_at = $1, sticker = $2, note = $3 WHERE id = $4 AND reviewed_at IS NULL', [
    new Date().toISOString(),
    sticker,
    note,
    chapterLogId,
  ]);
  if (changed === 0) throw new Problem(409, 'already-reviewed');
  const queue = await pendingChapterLogs(db, householdId);
  return { next: queue[0] ?? null, queueCount: queue.length };
}
