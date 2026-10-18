// Traces to: L2-030
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.ts';
import { transaction } from './db.ts';
import { createTestDatabase } from './test-db.ts';

test('Given 100 books of 80 chapters, then 95% of shelf, review and book reads answer within 300 ms', async () => {
  const db = await createTestDatabase();
  await transaction(db.pool, async (tx) => {
    await tx.query(`INSERT INTO household (id, time_zone) VALUES ('h1', 'UTC');
      INSERT INTO profile (id, household_id, role, name, color, username) VALUES ('p-r', 'h1', 'reader', 'Nia', 'rose', 'nia'), ('p-g', 'h1', 'parent', 'Dad', 'sky', 'dad');
      INSERT INTO session (id, profile_id, created_at, expires_at) VALUES ('s-r', 'p-r', '2026-01-01', '2999-01-01'), ('s-g', 'p-g', '2026-01-01', '2999-01-01');`);
    const books: string[] = [];
    const logs: string[] = [];
    const answers: string[] = [];
    for (let b = 0; b < 100; b++) {
      books.push(`('b${b}', 'h1', 'Book ${b}', 80, 'sage', '🦁', '2026-01-01')`);
      for (let c = 1; c <= 79; c++) {
        logs.push(`('b${b}-c${c}', 'b${b}', ${c}, '2026-10-01', '2026-10-01T10:00:00Z', '2026-10-01T10:00:00Z')`);
        answers.push(`('b${b}-c${c}-a', 'b${b}-c${c}', 1, 'Q', 'An answer.')`);
      }
    }
    await tx.query(`INSERT INTO book (id, household_id, title, chapter_count, cover_color, sticker, created_at) VALUES ${books.join(',')}`);
    await tx.query(`INSERT INTO chapter_log (id, book_id, chapter_number, read_on, logged_at, undo_until) VALUES ${logs.join(',')}`);
    await tx.query(`INSERT INTO answer (id, chapter_log_id, position, question_text, text) VALUES ${answers.join(',')}`);
  });

  const server = createApp(db.pool, { log: () => {} }).listen(0);
  try {
    const { port } = server.address() as { port: number };
    const timed = async (path: string, session: string) => {
      const started = performance.now();
      const response = await fetch(`http://localhost:${port}${path}`, { headers: { cookie: `shelfie_session=${session}` } });
      await response.text();
      assert.equal(response.status, 200);
      return performance.now() - started;
    };
    const p95 = (times: number[]) => times.sort((a, b) => a - b)[Math.ceil(times.length * 0.95) - 1];
    for (const [path, session] of [['/api/shelf', 's-r'], ['/api/review', 's-g'], ['/api/books/b50', 's-r']]) {
      const times: number[] = [];
      for (let i = 0; i < 50; i++) times.push(await timed(path, session));
      assert.ok(p95(times) < 300, `${path} p95 was ${Math.round(p95(times))} ms`);
    }
  } finally {
    server.close();
    await db.drop();
  }
});
