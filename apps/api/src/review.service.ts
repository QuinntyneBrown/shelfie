import { COVER_IMAGE_COLUMN } from './covers.service.ts';
import { all, get, run, type Db } from './db.ts';
import { goalOf, type Goal } from './gallery.service.ts';
import { Problem } from './problem.ts';
import { householdReaders, type ReaderLabel } from './readers.service.ts';
import { badgesFor, type Badge } from './badges.ts';
import { streakFor } from './streak.ts';
import { streakRewardsOf, type StreakReward } from './streak-rewards.service.ts';

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
  kind: 'chapter-logged' | 'book-added' | 'sticker-given' | 'book-finished';
  at: string;
  bookId: string;
  bookTitle: string;
  chapterNumber: number | null;
  sticker: string | null;
  byRole: 'reader' | 'parent';
}

const ACTIVITY_LIMIT = 20;

// One reader's books: every Review query is about the reader the parent picked (ADR-0019).
const READERS_BOOK = 'b.household_id = $1 AND b.reader_id IS NOT DISTINCT FROM $2';

function recentActivity(db: Db, householdId: string, readerId: string | null): Promise<ActivityItem[]> {
  return all<ActivityItem>(
    db,
    `SELECT * FROM (
       SELECT 'chapter-logged' AS kind, c.logged_at AS "at", b.id AS "bookId", b.title AS "bookTitle", c.chapter_number AS "chapterNumber", NULL::text AS sticker, 'reader' AS "byRole"
         FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE ${READERS_BOOK}
       UNION ALL
       SELECT 'sticker-given', c.reviewed_at, b.id, b.title, c.chapter_number, c.sticker, 'parent'
         FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE ${READERS_BOOK} AND c.reviewed_at IS NOT NULL
       UNION ALL
       SELECT 'book-added', b.created_at, b.id, b.title, NULL, NULL, b.added_by_role FROM book b WHERE ${READERS_BOOK}
       UNION ALL
       SELECT 'book-finished', b.finished_at, b.id, b.title, NULL, NULL, 'reader' FROM book b WHERE ${READERS_BOOK} AND b.finished_at IS NOT NULL
     ) activity ORDER BY "at" DESC, kind LIMIT $3`,
    [householdId, readerId, ACTIVITY_LIMIT],
  );
}

/** A reader in Review's picker, with how many of her chapters wait for feedback. */
export interface ReaderSummary extends ReaderLabel {
  waiting: number;
}

export interface ReviewOverview {
  activity: ActivityItem[];
  /** The reader the page is about; null in a household with no reader. */
  readerId: string | null;
  readerName: string;
  readers: ReaderSummary[];
  today: string;
  queue: QueueItem[];
  finishedUnrewarded: FinishedBook[];
  /** The reward gallery goal, so the book that reached it can say so. */
  goal: Goal | null;
  thisWeek: { chapters: number; streak: number };
  badges: Badge[];
  streakRewards: StreakReward[];
}

/** Chapters waiting for feedback, of one reader or, with `readerId` undefined, of the whole household. */
export function pendingChapterLogs(db: Db, householdId: string, readerId?: string | null): Promise<QueueItem[]> {
  return all<QueueItem>(
    db,
    `SELECT c.id AS "chapterLogId", b.id AS "bookId", b.title AS "bookTitle", b.cover_color AS "coverColor", b.sticker AS "coverSticker",
            ${COVER_IMAGE_COLUMN} AS "coverImage", c.chapter_number AS "chapterNumber", c.read_on AS "readOn"
       FROM chapter_log c JOIN book b ON b.id = c.book_id LEFT JOIN book_cover bc ON bc.book_id = b.id
      WHERE b.household_id = $1 AND ($2::boolean OR b.reader_id IS NOT DISTINCT FROM $3) AND c.reviewed_at IS NULL
      ORDER BY c.logged_at DESC, c.chapter_number DESC`,
    [householdId, readerId === undefined, readerId ?? null],
  );
}

/** Review about one reader (L2-142); the readers list counts every reader's waiting chapters for the picker and the badge. */
export async function overview(db: Db, householdId: string, readerId?: string | null, now = new Date()): Promise<ReviewOverview> {
  if (readerId === undefined) readerId = (await get<{ id: string | null }>(db, 'SELECT first_reader($1) AS id', [householdId]))!.id;
  const { time_zone } = (await get<{ time_zone: string }>(db, 'SELECT time_zone FROM household WHERE id = $1', [householdId]))!;
  const dayOf = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: time_zone }).format(date);
  const waiting = await all<{ reader_id: string; waiting: number }>(
    db,
    'SELECT b.reader_id, COUNT(*) AS waiting FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE b.household_id = $1 AND c.reviewed_at IS NULL GROUP BY b.reader_id',
    [householdId],
  );
  const readers = (await householdReaders(db, householdId)).map((r) => ({ ...r, waiting: waiting.find((w) => w.reader_id === r.id)?.waiting ?? 0 }));
  const finished = await all<Omit<FinishedBook, 'finishedOn'> & { finished_at: string }>(
    db,
    `SELECT b.id AS "bookId", b.title, b.cover_color AS "coverColor", b.sticker AS "coverSticker", ${COVER_IMAGE_COLUMN} AS "coverImage",
            b.chapter_count AS "chapterCount", b.finished_at
       FROM book b LEFT JOIN reward r ON r.book_id = b.id LEFT JOIN book_cover bc ON bc.book_id = b.id
      WHERE ${READERS_BOOK} AND b.finished_at IS NOT NULL AND r.book_id IS NULL
      ORDER BY b.finished_at DESC`,
    [householdId, readerId],
  );
  const weekStart = new Date(`${dayOf(now)}T00:00:00Z`);
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  const { chapters } = (await get<{ chapters: number }>(
    db,
    `SELECT COUNT(*) AS chapters FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE ${READERS_BOOK} AND c.read_on >= $3`,
    [householdId, readerId, weekStart.toISOString().slice(0, 10)],
  ))!;
  return {
    activity: await recentActivity(db, householdId, readerId),
    readerId,
    readerName: readers.find((r) => r.id === readerId)?.name ?? 'your reader',
    readers,
    thisWeek: { chapters, streak: await streakFor(db, householdId, now, readerId) },
    badges: await badgesFor(db, householdId, readerId),
    streakRewards: await streakRewardsOf(db, householdId, readerId, now),
    today: dayOf(now),
    queue: await pendingChapterLogs(db, householdId, readerId),
    finishedUnrewarded: finished.map(({ finished_at, ...book }) => ({ ...book, finishedOn: dayOf(new Date(finished_at)) })),
    goal: await goalOf(db, householdId),
  };
}

export const FEEDBACK_STICKERS = ['star', 'wise-owl', 'rocket', 'dragon', 'cookie', 'bright-idea'] as const;

/** Records Dad's sticker and note; a chapter is reviewed once, even if two sends race. */
export async function sendFeedback(db: Db, householdId: string, chapterLogId: string, sticker: string, note: string | null) {
  const log = await get<{ id: string; reviewed_at: string | null; reader_id: string | null }>(
    db,
    'SELECT c.id, c.reviewed_at, b.reader_id FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE c.id = $1 AND b.household_id = $2',
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
  // The next chapter is the same reader's; the count is the household's, for the badge in the navigation.
  const next = (await pendingChapterLogs(db, householdId, log.reader_id))[0] ?? null;
  return { next, queueCount: (await pendingChapterLogs(db, householdId)).length };
}
