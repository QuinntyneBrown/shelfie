import type { DatabaseSync } from 'node:sqlite';
import { Problem } from './problem.ts';
import { streakFor } from './streak.ts';

export interface QueueItem {
  chapterLogId: string;
  bookId: string;
  bookTitle: string;
  coverColor: string;
  coverSticker: string;
  chapterNumber: number;
  readOn: string;
}

export interface FinishedBook {
  bookId: string;
  title: string;
  coverColor: string;
  coverSticker: string;
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
  byRole: 'reader' | 'grown_up';
}

const ACTIVITY_LIMIT = 20;

function recentActivity(db: DatabaseSync, householdId: string): ActivityItem[] {
  return db
    .prepare(
      `SELECT * FROM (
         SELECT 'chapter-logged' AS kind, c.logged_at AS at, b.id AS bookId, b.title AS bookTitle, c.chapter_number AS chapterNumber, NULL AS sticker, 'reader' AS byRole
           FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE b.household_id = ?
         UNION ALL
         SELECT 'sticker-given', c.reviewed_at, b.id, b.title, c.chapter_number, c.sticker, 'grown_up'
           FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE b.household_id = ? AND c.reviewed_at IS NOT NULL
         UNION ALL
         SELECT 'book-added', b.created_at, b.id, b.title, NULL, NULL, b.added_by_role FROM book b WHERE b.household_id = ?
         UNION ALL
         SELECT 'book-finished', b.finished_at, b.id, b.title, NULL, NULL, 'reader' FROM book b WHERE b.household_id = ? AND b.finished_at IS NOT NULL
       ) ORDER BY at DESC, kind LIMIT ?`,
    )
    .all(householdId, householdId, householdId, householdId, ACTIVITY_LIMIT) as unknown as ActivityItem[];
}

export interface ReviewOverview {
  activity: ActivityItem[];
  readerName: string;
  today: string;
  queue: QueueItem[];
  finishedUnrewarded: FinishedBook[];
  thisWeek: { chapters: number; streak: number };
}

export function pendingChapterLogs(db: DatabaseSync, householdId: string): QueueItem[] {
  return db
    .prepare(
      `SELECT c.id AS chapterLogId, b.id AS bookId, b.title AS bookTitle, b.cover_color AS coverColor, b.sticker AS coverSticker,
              c.chapter_number AS chapterNumber, c.read_on AS readOn
         FROM chapter_log c JOIN book b ON b.id = c.book_id
        WHERE b.household_id = ? AND c.reviewed_at IS NULL
        ORDER BY c.logged_at DESC, c.chapter_number DESC`,
    )
    .all(householdId) as unknown as QueueItem[];
}

export function overview(db: DatabaseSync, householdId: string, now = new Date()): ReviewOverview {
  const { time_zone } = db.prepare('SELECT time_zone FROM household WHERE id = ?').get(householdId) as { time_zone: string };
  const dayOf = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: time_zone }).format(date);
  const reader = db.prepare("SELECT name FROM profile WHERE household_id = ? AND role = 'reader'").get(householdId) as { name: string };
  const finished = db
    .prepare(
      `SELECT b.id AS bookId, b.title, b.cover_color AS coverColor, b.sticker AS coverSticker, b.chapter_count AS chapterCount, b.finished_at
         FROM book b LEFT JOIN reward r ON r.book_id = b.id
        WHERE b.household_id = ? AND b.finished_at IS NOT NULL AND r.book_id IS NULL
        ORDER BY b.finished_at DESC`,
    )
    .all(householdId) as unknown as (Omit<FinishedBook, 'finishedOn'> & { finished_at: string })[];
  const weekStart = new Date(`${dayOf(now)}T00:00:00Z`);
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  const { chapters } = db
    .prepare('SELECT COUNT(*) AS chapters FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE b.household_id = ? AND c.read_on >= ?')
    .get(householdId, weekStart.toISOString().slice(0, 10)) as { chapters: number };
  return {
    activity: recentActivity(db, householdId),
    readerName: reader.name,
    thisWeek: { chapters, streak: streakFor(db, householdId, now) },
    today: dayOf(now),
    queue: pendingChapterLogs(db, householdId),
    finishedUnrewarded: finished.map(({ finished_at, ...book }) => ({ ...book, finishedOn: dayOf(new Date(finished_at)) })),
  };
}

export const FEEDBACK_STICKERS = ['star', 'wise-owl', 'rocket', 'dragon', 'cookie', 'bright-idea'] as const;

/** Records Dad's sticker and note; a chapter is reviewed once, even if two sends race. */
export function sendFeedback(db: DatabaseSync, householdId: string, chapterLogId: string, sticker: string, note: string | null) {
  const log = db
    .prepare('SELECT c.id, c.reviewed_at FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE c.id = ? AND b.household_id = ?')
    .get(chapterLogId, householdId) as { id: string; reviewed_at: string | null } | undefined;
  if (!log) throw new Problem(404, 'not-found');
  const changed = db
    .prepare('UPDATE chapter_log SET reviewed_at = ?, sticker = ?, note = ? WHERE id = ? AND reviewed_at IS NULL')
    .run(new Date().toISOString(), sticker, note, chapterLogId).changes;
  if (changed === 0) throw new Problem(409, 'already-reviewed');
  const queue = pendingChapterLogs(db, householdId);
  return { next: queue[0] ?? null, queueCount: queue.length };
}
