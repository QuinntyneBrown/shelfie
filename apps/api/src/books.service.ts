import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

export interface NewBook {
  title: string;
  author: string | null;
  chapterCount: number;
  coverColor: string;
  sticker: string;
}

export function createBook(db: DatabaseSync, householdId: string, role: 'reader' | 'grown_up', book: NewBook): { id: string } {
  const id = randomUUID();
  db.prepare(
    'INSERT INTO book (id, household_id, title, author, chapter_count, cover_color, sticker, added_by_role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(id, householdId, book.title, book.author, book.chapterCount, book.coverColor, book.sticker, role, new Date().toISOString());
  return { id };
}
