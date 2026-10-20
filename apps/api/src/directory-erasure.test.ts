// Traces to: L2-179, L2-166
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from './auth.service.ts';
import { all, get, run } from './db.ts';
import { seed, SEED } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

/** The runbook's erasure statement for an author or volunteer (docs/runbook.md). */
const ERASE = "DELETE FROM profile WHERE id = $1 AND role IN ('author','volunteer')";
const OWNED = ['profile', 'directory_profile', 'catalogue_book', 'catalogue_cover', 'profile_photo', 'session', 'password_reset'];

test('Given Rosa with a profile, photo, sessions, a reset link and books with pictures, when the operator erases her, then every row she owned is gone and a household’s copy of her book stays', async () => {
  const db = await createTestDatabase();
  try {
    await seed(db.pool);
    await join(db.pool, { kind: 'author', name: 'Rosa Delgado', email: 'rosa@example.com', username: 'rosawrites', password: 'lighthouse-fox' });
    await join(db.pool, { kind: 'volunteer', name: 'Sam Okafor', email: 'sam@example.com', username: 'samreads', password: 'patient-reader' });
    const { id: rosa } = (await get<{ id: string }>(db.pool, "SELECT id FROM profile WHERE username = 'rosawrites'"))!;
    await run(db.pool, "INSERT INTO profile_photo (profile_id, image, etag, updated_at) VALUES ($1, 'x', 'e1', '2026-10-19')", [rosa]);
    await run(db.pool, "INSERT INTO password_reset (token_hash, profile_id, expires_at) VALUES ('t1', $1, '2999-01-01')", [rosa]);
    await run(db.pool, "INSERT INTO catalogue_book (id, profile_id, title, chapter_count, created_at) VALUES ('cb-fox', $1, 'The Lighthouse Fox', 12, '2026-10-19'), ('cb-moon', $1, 'Pip and the Paper Moon', 9, '2026-10-19')", [rosa]);
    await run(db.pool, "INSERT INTO catalogue_cover (book_id, image, etag, updated_at) VALUES ('cb-fox', 'x', 'e1', '2026-10-19')");
    // Dad added the fox to Nia's shelf: a copy with its own picture (ADR-0025).
    await run(db.pool, "INSERT INTO book (id, household_id, title, author, chapter_count, cover_color, sticker, created_at) VALUES ('b-fox', $1, 'The Lighthouse Fox', 'Rosa Delgado', 12, 'sky', '📚', '2026-10-19')", [SEED.householdId]);
    await run(db.pool, "INSERT INTO book_cover (book_id, image, etag, updated_at) VALUES ('b-fox', 'x', 'e2', '2026-10-19')");
    const owned = async (id: string) =>
      Object.fromEntries(
        await Promise.all(
          OWNED.map(async (table) => {
            const column = table === 'profile' ? 'id' : table === 'catalogue_cover' ? 'book_id' : 'profile_id';
            const where = table === 'catalogue_cover' ? 'book_id IN (SELECT id FROM catalogue_book WHERE profile_id = $1)' : `${column} = $1`;
            return [table, (await get<{ n: number }>(db.pool, `SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`, [id]))!.n];
          }),
        ),
      );
    assert.deepEqual(await owned(rosa), { profile: 1, directory_profile: 1, catalogue_book: 2, catalogue_cover: 1, profile_photo: 1, session: 1, password_reset: 1 });

    assert.equal(await run(db.pool, ERASE, [rosa]), 1);

    assert.deepEqual(await owned(rosa), { profile: 0, directory_profile: 0, catalogue_book: 0, catalogue_cover: 0, profile_photo: 0, session: 0, password_reset: 0 });
    assert.equal((await all(db.pool, 'SELECT 1 FROM catalogue_cover')).length, 0);
    assert.deepEqual(await get(db.pool, "SELECT title, author FROM book WHERE id = 'b-fox'"), { title: 'The Lighthouse Fox', author: 'Rosa Delgado' });
    assert.equal((await all(db.pool, "SELECT 1 FROM book_cover WHERE book_id = 'b-fox'")).length, 1);
    assert.deepEqual((await all<{ username: string }>(db.pool, 'SELECT username FROM profile WHERE household_id IS NULL')).map((r) => r.username), ['samreads']);
  } finally {
    await db.drop();
  }
});

test('Given a parent’s or a reader’s id, when the author-and-volunteer erasure statement is run with it, then nothing is deleted', async () => {
  const db = await createTestDatabase();
  try {
    await seed(db.pool);

    assert.equal(await run(db.pool, ERASE, [SEED.parentId]), 0);
    assert.equal(await run(db.pool, ERASE, [SEED.readerId]), 0);
    assert.equal((await all(db.pool, 'SELECT 1 FROM profile WHERE household_id = $1', [SEED.householdId])).length, 2);
  } finally {
    await db.drop();
  }
});
