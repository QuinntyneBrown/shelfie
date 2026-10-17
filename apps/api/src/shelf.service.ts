import type { DatabaseSync } from 'node:sqlite';
import { streakFor } from './streak.ts';

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
  finishedOn: string;
  reward: { text: string; givenOn: string } | null;
}

export interface UnseenFeedback {
  chapterLogId: string;
  bookId: string;
  bookTitle: string;
  chapterNumber: number;
  sticker: string;
}

export interface ShelfResponse {
  unseenFeedback: UnseenFeedback[];
  streak: number;
  grownUpName: string;
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
  reward_text: string | null;
  reward_given_at: string | null;
}

export function getShelf(db: DatabaseSync, householdId: string): ShelfResponse {
  const rows = db
    .prepare(
      `SELECT b.id, b.title, b.author, b.chapter_count, b.cover_color, b.sticker, b.created_at, b.finished_at,
              COUNT(c.id) AS logged_count, MAX(c.logged_at) AS last_logged_at,
              r.text AS reward_text, r.given_at AS reward_given_at
         FROM book b LEFT JOIN chapter_log c ON c.book_id = b.id LEFT JOIN reward r ON r.book_id = b.id
        WHERE b.household_id = ? GROUP BY b.id`,
    )
    .all(householdId) as unknown as BookRow[];

  const { time_zone } = db.prepare('SELECT time_zone FROM household WHERE id = ?').get(householdId) as { time_zone: string };
  const grownUp = db.prepare("SELECT name FROM profile WHERE household_id = ? AND role = 'grown_up'").get(householdId) as { name: string };
  const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: time_zone });
  const dayOf = (iso: string) => dayFormat.format(new Date(iso));

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

  const unseenFeedback = db
    .prepare(
      `SELECT c.id AS chapterLogId, b.id AS bookId, b.title AS bookTitle, c.chapter_number AS chapterNumber, c.sticker
         FROM chapter_log c JOIN book b ON b.id = c.book_id
        WHERE b.household_id = ? AND c.reviewed_at IS NOT NULL AND c.feedback_seen_at IS NULL
        ORDER BY c.reviewed_at DESC`,
    )
    .all(householdId) as unknown as UnseenFeedback[];

  return {
    unseenFeedback,
    streak: streakFor(db, householdId),
    grownUpName: grownUp.name,
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
      .sort((a, b) => newestFirst(a.finished_at!, b.finished_at!))
      .map((r) => ({
        id: r.id,
        title: r.title,
        coverColor: r.cover_color,
        sticker: r.sticker,
        finishedOn: dayOf(r.finished_at!),
        reward: r.reward_text ? { text: r.reward_text, givenOn: dayOf(r.reward_given_at!) } : null,
      })),
  };
}
