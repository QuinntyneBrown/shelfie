import { get, type Db } from './db.ts';
import { Problem } from './problem.ts';
import { questionsForBook } from './questions.service.ts';

/** Everything the AI service is told about a book (L2-067): no names, answers or ids. */
export interface SuggestionInput {
  title: string;
  author: string | null;
  chapter: number;
  questions: string[];
}

/** Drafts questions for a book. Production asks Claude; tests pass a fake. */
export type SuggestQuestions = (input: SuggestionInput) => Promise<string[]>;

const MAX_SUGGESTIONS = 5;

/** Ideas for the book's next chapter that fit L2-013 and that the book doesn't already ask. Nothing is stored. */
export async function suggestQuestions(db: Db, householdId: string, bookId: string, suggest: SuggestQuestions) {
  const book = await get<{ title: string; author: string | null; chapterCount: number; loggedCount: number }>(
    db,
    `SELECT title, author, chapter_count AS "chapterCount",
            (SELECT COUNT(*)::int FROM chapter_log c WHERE c.book_id = b.id) AS "loggedCount"
       FROM book b WHERE id = $1 AND household_id = $2`,
    [bookId, householdId],
  );
  if (!book) throw new Problem(404, 'not-found');
  const chapter = Math.min(book.loggedCount + 1, book.chapterCount);
  const questions = await questionsForBook(db, bookId);
  const ideas = await suggest({ title: book.title, author: book.author, chapter, questions });

  const seen = new Set(questions.map((q) => q.trim().toLowerCase()));
  const suggestions: string[] = [];
  for (const idea of ideas) {
    const text = idea.trim();
    const key = text.toLowerCase();
    if (text.length < 5 || text.length > 200 || seen.has(key)) continue;
    seen.add(key);
    suggestions.push(text);
    if (suggestions.length === MAX_SUGGESTIONS) break;
  }
  return { chapter, suggestions };
}
