// Traces to: L2-050, L2-052, L2-053, L2-061, L2-062
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { auditRows, call, seededDb, tokenFor } from './admin-test-api.ts';
import { get } from './db.ts';
import { overview } from './review.service.ts';

const finishedAt = async (db: Pool, id: string) => (await get<{ finished_at: string | null }>(db, 'SELECT finished_at FROM book WHERE id = $1', [id]))!.finished_at;
const reward = (db: Pool, id: string) => get(db, 'SELECT text, note FROM reward WHERE book_id = $1', [id]);

test('Given a book that is not finished, when finish is called, then it is finished now and waits for a reward', async () => {
  const db = await seededDb();
  const response = await call(db, 'POST', '/api/admin/v1/books/b-lion/finish', { token: await tokenFor(db) });

  assert.equal(response.status, 200);
  assert.equal(response.body.id, 'b-lion');
  assert.equal(response.body.title, 'The Lion, the Witch and the Wardrobe');
  assert.equal(response.body.dryRun, false);
  assert.ok(Math.abs(Date.parse(response.body.finishedAt) - Date.now()) < 5000);
  assert.equal(await finishedAt(db, 'b-lion'), response.body.finishedAt);
  assert.ok((await overview(db, 'h1')).finishedUnrewarded.some((b: { bookId: string }) => b.bookId === 'b-lion'));
});

test('Given a book already finished, then finish is refused with book-already-finished', async () => {
  const db = await seededDb();
  const response = await call(db, 'POST', '/api/admin/v1/books/b-matilda/finish', { token: await tokenFor(db) });
  assert.deepEqual([response.status, response.body.type], [400, 'book-already-finished']);
});

test('Given a dry run, then finish answers what would change, changes nothing and is audited as a dry run', async () => {
  const db = await seededDb();
  const response = await call(db, 'POST', '/api/admin/v1/books/b-lion/finish?dryRun=true', { token: await tokenFor(db) });

  assert.deepEqual([response.status, response.body.dryRun], [200, true]);
  assert.equal(await finishedAt(db, 'b-lion'), null);
  assert.equal((await auditRows(db))[0]['dry_run'], 1);
});

test('Given a read-only token, then a write is refused with 403 scope-missing and nothing changes', async () => {
  const db = await seededDb();
  const response = await call(db, 'POST', '/api/admin/v1/books/b-lion/finish', { token: await tokenFor(db, ['read']) });
  assert.deepEqual([response.status, response.body.type], [403, 'scope-missing']);
  assert.equal(await finishedAt(db, 'b-lion'), null);
});

test('Given a finished book, when a reward is given, then it is stored as from the web app', async () => {
  const db = await seededDb();
  const response = await call(db, 'POST', '/api/admin/v1/books/b-matilda/reward', { token: await tokenFor(db), body: { text: 'Ice cream', note: 'Well done' } });

  assert.equal(response.status, 201);
  assert.deepEqual([response.body.bookId, response.body.text, response.body.note, response.body.dryRun], ['b-matilda', 'Ice cream', 'Well done', false]);
  assert.deepEqual({ ...((await reward(db, 'b-matilda')) as object) }, { text: 'Ice cream', note: 'Well done' });
});

test('Given a dry-run reward, then nothing is stored', async () => {
  const db = await seededDb();
  const response = await call(db, 'POST', '/api/admin/v1/books/b-matilda/reward?dryRun=true', { token: await tokenFor(db), body: { text: 'Ice cream' } });
  assert.deepEqual([response.status, response.body.dryRun], [201, true]);
  assert.equal(await reward(db, 'b-matilda'), undefined);
});

test('Given a book not finished or already rewarded, then the reward is refused by type', async () => {
  const db = await seededDb();
  const token = await tokenFor(db);
  const notFinished = await call(db, 'POST', '/api/admin/v1/books/b-lion/reward', { token, body: { text: 'Ice cream' } });
  const exists = await call(db, 'POST', '/api/admin/v1/books/b-web/reward', { token, body: { text: 'Ice cream' } });
  const unknown = await call(db, 'POST', '/api/admin/v1/books/nope/reward', { token, body: { text: 'Ice cream' } });

  assert.deepEqual([notFinished.status, notFinished.body.type], [400, 'book-not-finished']);
  assert.deepEqual([exists.status, exists.body.type], [409, 'reward-exists']);
  assert.deepEqual([unknown.status, unknown.body.type], [404, 'not-found']);
});

test('Given reward text that is empty or over 100 characters, then 400 validation names the field and nothing is stored', async () => {
  const db = await seededDb();
  const token = await tokenFor(db);
  for (const text of ['', 'x'.repeat(101)]) {
    const response = await call(db, 'POST', '/api/admin/v1/books/b-matilda/reward', { token, body: { text } });
    assert.deepEqual([response.status, response.body.type, response.body.errors[0].field], [400, 'validation', 'text']);
  }
  assert.equal(await reward(db, 'b-matilda'), undefined);
});
