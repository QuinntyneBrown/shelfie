import type { DatabaseSync } from 'node:sqlite';

export interface ShelfBook {
  id: string;
  title: string;
  author: string | null;
  chapterCount: number;
  coverColor: string;
  sticker: string;
  loggedCount: number;
  nextChapter: number;
  lastLoggedAt: string | null;
  createdAt: string;
}

export interface FinishedBook {
  id: string;
  title: string;
  coverColor: string;
  sticker: string;
  finishedAt: string;
}

export interface ShelfResponse {
  reading: ShelfBook[];
  upNext: ShelfBook[];
  finished: FinishedBook[];
}

interface BookRow {
  id: string;
  title: string;
  author: string | null;
  chapter_count: number;
  cover_color: string;
  sticker: string;
  created_at: string;
  finished_at: string | null;
  logged_count: number;
  last_logged_at: string | null;
}

export function getShelf(db: DatabaseSync, householdId: string): ShelfResponse {
  const rows = db
    .prepare(
      `SELECT b.id, b.title, b.author, b.chapter_count, b.cover_color, b.sticker, b.created_at, b.finished_at,
              COUNT(c.id) AS logged_count, MAX(c.logged_at) AS last_logged_at
         FROM book b LEFT JOIN chapter_log c ON c.book_id = b.id
        WHERE b.household_id = ? GROUP BY b.id`,
    )
    .all(householdId) as unknown as BookRow[];

  const toShelfBook = (r: BookRow): ShelfBook => ({
    id: r.id,
    title: r.title,
    author: r.author,
    chapterCount: r.chapter_count,
    coverColor: r.cover_color,
    sticker: r.sticker,
    loggedCount: r.logged_count,
    nextChapter: r.logged_count + 1,
    lastLoggedAt: r.last_logged_at,
    createdAt: r.created_at,
  });
  const newestFirst = (a: string, b: string) => b.localeCompare(a);

  return {
    reading: rows
      .filter((r) => !r.finished_at && r.logged_count > 0)
      .map(toShelfBook)
      .sort((a, b) => newestFirst(a.lastLoggedAt!, b.lastLoggedAt!)),
    upNext: rows
      .filter((r) => !r.finished_at && r.logged_count === 0)
      .map(toShelfBook)
      .sort((a, b) => newestFirst(a.createdAt, b.createdAt)),
    finished: rows
      .filter((r) => r.finished_at)
      .map((r) => ({ id: r.id, title: r.title, coverColor: r.cover_color, sticker: r.sticker, finishedAt: r.finished_at! }))
      .sort((a, b) => newestFirst(a.finishedAt, b.finishedAt)),
  };
}
