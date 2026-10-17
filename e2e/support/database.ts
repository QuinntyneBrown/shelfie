import { DatabaseSync } from 'node:sqlite';

/** The day a chapter was read, as stored; undefined when the chapter is not logged. */
export function readOnOf(bookId: string, chapter: number): string | undefined {
  const db = new DatabaseSync('e2e.db', { readOnly: true });
  try {
    const row = db.prepare('SELECT read_on FROM chapter_log WHERE book_id = ? AND chapter_number = ?').get(bookId, chapter) as
      | { read_on: string }
      | undefined;
    return row?.read_on;
  } finally {
    db.close();
  }
}

/** Calendar day in the seeded household's time zone (UTC), `offset` days from today. */
export function householdDay(offset = 0): string {
  return new Date(Date.now() + offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Ages every session past its 30-day idle limit, as if nobody had touched the app for a month. */
export function expireSessions() {
  const db = new DatabaseSync('e2e.db');
  try {
    db.exec("UPDATE session SET expires_at = '2020-01-01T00:00:00.000Z'");
  } finally {
    db.close();
  }
}

/** Leaves every session one day from expiring. */
export function shortenSessions() {
  const db = new DatabaseSync('e2e.db');
  try {
    db.prepare('UPDATE session SET expires_at = ?').run(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
  } finally {
    db.close();
  }
}

/** When the newest session expires, as stored. */
export function sessionExpiresAt(): string {
  const db = new DatabaseSync('e2e.db', { readOnly: true });
  try {
    return (db.prepare('SELECT expires_at FROM session ORDER BY created_at DESC LIMIT 1').get() as { expires_at: string }).expires_at;
  } finally {
    db.close();
  }
}

/** Makes every reset link older than its hour. */
export function expireResetLinks() {
  const db = new DatabaseSync('e2e.db');
  try {
    db.exec("UPDATE password_reset SET expires_at = '2020-01-01T00:00:00.000Z'");
  } finally {
    db.close();
  }
}

/** The question texts stored with a logged chapter's answers, in order. */
export function questionsAnswered(bookId: string, chapter: number): string[] {
  const db = new DatabaseSync('e2e.db', { readOnly: true });
  try {
    const rows = db
      .prepare(
        'SELECT a.question_text FROM answer a JOIN chapter_log c ON c.id = a.chapter_log_id WHERE c.book_id = ? AND c.chapter_number = ? ORDER BY a.position',
      )
      .all(bookId, chapter) as { question_text: string }[];
    return rows.map((r) => r.question_text);
  } finally {
    db.close();
  }
}
