// Traces to: L2-041, L2-045, L2-048, L2-109
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { all, get, run } from './db.ts';
import { purgeExpired } from './purge.ts';
import { seed, SEED } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const OWNED = ['profile', 'session', 'password_reset', 'invites', 'book', 'chapter_log', 'answer', 'question', 'reward', 'profile_photo', 'book_cover', 'gallery_reward', 'streak_reward', 'reward_picture'];

test('Given two households, when one is erased, then every row it owned is gone and the other household is untouched', async () => {
  const db = await createTestDatabase();
  try {
    await seed(db.pool);
    await run(db.pool, "INSERT INTO session (id, profile_id, created_at, expires_at) VALUES ('s1', $1, '2026-10-01', '2999-01-01'), ('s2', 'p-other-dad', '2026-10-01', '2999-01-01')", [SEED.parentId]);
    await run(db.pool, "INSERT INTO password_reset (token_hash, profile_id, expires_at) VALUES ('t1', $1, '2999-01-01'), ('t2', 'p-other-dad', '2999-01-01')", [SEED.parentId]);
    await run(db.pool, "INSERT INTO question (id, book_id, text, created_at) VALUES ('q1', 'b-lion', 'Why?', '2026-10-01'), ('q2', 'b-other', 'Why?', '2026-10-01')");
    await run(
      db.pool,
      "INSERT INTO invites (token_hash, email, household_id, invited_by, expires_at) VALUES ('i1', 'mum@example.com', $1, $2, '2999-01-01'), ('i2', 'aunt@example.com', 'h2', 'p-other-dad', '2999-01-01')",
      [SEED.householdId, SEED.parentId],
    );
    await run(db.pool, "INSERT INTO profile_photo (profile_id, image, etag, updated_at) VALUES ($1, 'x', 'e1', '2026-10-18'), ($2, 'x', 'e2', '2026-10-18'), ('p-other-dad', 'x', 'e3', '2026-10-18')", [SEED.parentId, SEED.readerId]);
    await run(db.pool, "INSERT INTO book_cover (book_id, image, etag, updated_at) VALUES ('b-lion', 'x', 'e1', '2026-10-18'), ('b-other', 'x', 'e2', '2026-10-18')");
    await run(db.pool, "INSERT INTO gallery_reward (id, household_id, name, target, created_at) VALUES ('g1', $1, 'Zoo', 3, '2026-10-18'), ('g2', 'h2', 'Kite', 2, '2026-10-18')", [SEED.householdId]);
    await run(db.pool, "INSERT INTO streak_reward (household_id, milestone, name) VALUES ($1, 7, 'Ice cream'), ('h2', 7, 'Kite')", [SEED.householdId]);
    await run(db.pool, "INSERT INTO reward_picture (id, reward_id, image, etag, featured, created_at) VALUES ('rp1', 'g1', 'x', 'e1', true, '2026-10-18'), ('rp2', 'g1', 'x', 'e2', false, '2026-10-18'), ('rp3', 'g2', 'x', 'e3', true, '2026-10-18')");
    const countAll = async () => Object.fromEntries(await Promise.all(OWNED.map(async (t) => [t, (await get<{ n: number }>(db.pool, `SELECT COUNT(*) AS n FROM ${t}`))!.n])));
    const before = await countAll();

    await run(db.pool, 'DELETE FROM household WHERE id = $1', [SEED.householdId]);

    const after = await countAll();
    assert.deepEqual(after, { profile: 2, session: 1, password_reset: 1, invites: 1, book: 1, chapter_log: 1, answer: 0, question: 1, reward: 0, profile_photo: 1, book_cover: 1, gallery_reward: 1, streak_reward: 1, reward_picture: 1 });
    assert.ok(before.book > after.book && before.answer > 0, 'the erased household had books and answers');
    const remaining = await all<{ id: string }>(db.pool, 'SELECT id FROM profile ORDER BY id');
    assert.deepEqual(remaining.map((p) => p.id), ['p-other-dad', 'p-other-reader']);
    assert.equal((await get<{ id: string }>(db.pool, "SELECT id FROM book WHERE id = 'b-other'"))?.id, 'b-other');
  } finally {
    await db.drop();
  }
});

test('Given stale and live sessions, reset tokens and sign-in attempts, when the nightly purge runs, then only the stale ones are deleted', async () => {
  const db = await createTestDatabase();
  try {
    await seed(db.pool);
    const now = new Date('2026-10-18T08:15:00.000Z');
    await run(db.pool, "INSERT INTO session (id, profile_id, created_at, expires_at) VALUES ('stale', $1, '2026-09-01', '2026-10-18T08:00:00.000Z'), ('live', $1, '2026-10-17', '2026-11-16T00:00:00.000Z')", [SEED.parentId]);
    await run(
      db.pool,
      "INSERT INTO password_reset (token_hash, profile_id, expires_at, used_at) VALUES ('used', $1, '2999-01-01', '2026-10-17T00:00:00.000Z'), ('expired', $1, '2026-10-18T07:00:00.000Z', NULL), ('live', $1, '2026-10-18T09:00:00.000Z', NULL)",
      [SEED.parentId],
    );
    await run(db.pool, "INSERT INTO sign_in_attempt (source, at) VALUES ('1.1.1.1', '2026-10-18T08:00:00.000Z'), ('1.1.1.1', '2026-10-18T08:10:00.000Z')");

    await purgeExpired(db.pool, now);

    assert.deepEqual((await all<{ id: string }>(db.pool, 'SELECT id FROM session')).map((r) => r.id), ['live']);
    assert.deepEqual((await all<{ token_hash: string }>(db.pool, 'SELECT token_hash FROM password_reset')).map((r) => r.token_hash), ['live']);
    assert.deepEqual((await all<{ at: string }>(db.pool, 'SELECT at FROM sign_in_attempt')).map((r) => r.at), ['2026-10-18T08:10:00.000Z']);
  } finally {
    await db.drop();
  }
});
