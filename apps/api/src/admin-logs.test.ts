// Traces to: L2-053, L2-060, L2-062
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { call, seededDb, tokenFor } from './admin-test-api.ts';
import { get } from './db.ts';
import { streakFor } from './streak.ts';

const readOn = async (db: Pool, id: string) => (await get<{ read_on: string }>(db, 'SELECT read_on FROM chapter_log WHERE id = $1', [id]))!.read_on;
const sixteenth = new Date('2026-10-16T12:00:00.000Z');

test('Given a past day, when a log is corrected, then its read-on day changes and the streak follows', async () => {
  const db = await seededDb();
  assert.equal(await streakFor(db, 'h1', sixteenth), 4, 'the 11th is missing before the correction');

  const response = await call(db, 'PATCH', '/api/admin/v1/logs/b-web-c3', { token: await tokenFor(db), body: { readOn: '2026-10-11' } });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { id: 'b-web-c3', bookTitle: 'Charlotte’s Web', chapter: 3, previousReadOn: '2026-10-10', readOn: '2026-10-11', dryRun: false });
  assert.equal(await readOn(db, 'b-web-c3'), '2026-10-11');
  assert.equal(await streakFor(db, 'h1', sixteenth), 6);
});

test('Given a dry run, then the correction is reported and not applied', async () => {
  const db = await seededDb();
  const response = await call(db, 'PATCH', '/api/admin/v1/logs/b-web-c3?dryRun=true', { token: await tokenFor(db), body: { readOn: '2026-10-11' } });
  assert.deepEqual([response.status, response.body.dryRun, await readOn(db, 'b-web-c3')], [200, true, '2026-10-10']);
});

test('Given a day after today in the household time zone, then the correction is refused with future-date', async () => {
  const db = await seededDb();
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const response = await call(db, 'PATCH', '/api/admin/v1/logs/b-web-c3', { token: await tokenFor(db), body: { readOn: tomorrow } });
  assert.deepEqual([response.status, response.body.type, await readOn(db, 'b-web-c3')], [400, 'future-date', '2026-10-10']);
});

test('Given a malformed day or an unknown log, then 400 validation or 404 not-found', async () => {
  const db = await seededDb();
  const token = await tokenFor(db);
  const malformed = await call(db, 'PATCH', '/api/admin/v1/logs/b-web-c3', { token, body: { readOn: '11/10/2026' } });
  const unknown = await call(db, 'PATCH', '/api/admin/v1/logs/nope', { token, body: { readOn: '2026-10-11' } });
  assert.deepEqual([malformed.status, malformed.body.errors[0].field], [400, 'readOn']);
  assert.deepEqual([unknown.status, unknown.body.type], [404, 'not-found']);
});

const logExists = async (db: Pool, id: string) => !!(await get(db, 'SELECT 1 FROM chapter_log WHERE id = $1', [id]));
const answerCount = async (db: Pool, id: string) => (await get<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM answer WHERE chapter_log_id = $1', [id]))!.n;

test('Given the newest logged chapter, when it is deleted, then the log and its answers are gone', async () => {
  const db = await seededDb();
  const response = await call(db, 'DELETE', '/api/admin/v1/logs/b-bfg-c2', { token: await tokenFor(db) });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { id: 'b-bfg-c2', bookTitle: 'The BFG', chapter: 2, answersDeleted: 1, dryRun: false });
  assert.equal(await logExists(db, 'b-bfg-c2'), false);
  assert.equal(await answerCount(db, 'b-bfg-c2'), 0);
});

test('Given the last chapter of a finished book, when it is deleted, then the book is no longer finished', async () => {
  const db = await seededDb();
  assert.equal((await call(db, 'DELETE', '/api/admin/v1/logs/b-matilda-c3', { token: await tokenFor(db) })).status, 200);
  assert.equal((await get<{ finished_at: string | null }>(db, "SELECT finished_at FROM book WHERE id = 'b-matilda'"))!.finished_at, null);
});

test('Given a dry-run delete, then the log stays', async () => {
  const db = await seededDb();
  const response = await call(db, 'DELETE', '/api/admin/v1/logs/b-bfg-c2?dryRun=true', { token: await tokenFor(db) });
  assert.deepEqual([response.status, response.body.dryRun, await logExists(db, 'b-bfg-c2'), await answerCount(db, 'b-bfg-c2')], [200, true, true, 1]);
});

test('Given a log that is not the newest, or a book with a reward, then the delete is refused by type', async () => {
  const db = await seededDb();
  const token = await tokenFor(db);
  const notLatest = await call(db, 'DELETE', '/api/admin/v1/logs/b-bfg-c1', { token });
  const rewarded = await call(db, 'DELETE', '/api/admin/v1/logs/b-web-c3', { token });

  assert.deepEqual([notLatest.status, notLatest.body.type], [400, 'log-not-latest']);
  assert.deepEqual([rewarded.status, rewarded.body.type], [400, 'book-rewarded']);
  assert.ok((await logExists(db, 'b-bfg-c1')) && (await logExists(db, 'b-web-c3')));
});
