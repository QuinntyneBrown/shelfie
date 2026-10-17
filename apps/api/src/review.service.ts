import type { DatabaseSync } from 'node:sqlite';
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

export interface ReviewOverview {
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
    readerName: reader.name,
    thisWeek: { chapters, streak: streakFor(db, householdId, now) },
    today: dayOf(now),
    queue: pendingChapterLogs(db, householdId),
    finishedUnrewarded: finished.map(({ finished_at, ...book }) => ({ ...book, finishedOn: dayOf(new Date(finished_at)) })),
  };
}
