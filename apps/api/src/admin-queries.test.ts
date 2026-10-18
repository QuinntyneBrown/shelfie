// Traces to: L2-052, L2-053, L2-056, L2-057, L2-058
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditRows, call, seededDb, tokenFor } from './admin-test-api.ts';

test('Given GET users, then every profile of every household is listed without any secret', async () => {
  const db = await seededDb();
  const response = await call(db, 'GET', '/api/admin/v1/users', { token: await tokenFor(db, ['read']) });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, [
    { id: 'p-dad', householdId: 'h1', role: 'parent', name: 'Dad', email: 'dad@example.com' },
    { id: 'p-nia', householdId: 'h1', role: 'reader', name: 'Nia', email: null },
    { id: 'p-other-dad', householdId: 'h2', role: 'parent', name: 'Zed’s dad', email: 'other@example.com' },
    { id: 'p-other-reader', householdId: 'h2', role: 'reader', name: 'Zed', email: null },
  ]);
});

test('Given GET books, then every book is listed with progress, finished time and reward', async () => {
  const db = await seededDb();
  const { body } = await call(db, 'GET', '/api/admin/v1/books', { token: await tokenFor(db, ['read']) });

  assert.equal(body.length, 7);
  const byId = Object.fromEntries(body.map((b: { id: string }) => [b.id, b]));
  assert.deepEqual(byId['b-lion'], {
    id: 'b-lion', householdId: 'h1', title: 'The Lion, the Witch and the Wardrobe', chaptersLogged: 11, chapterCount: 17, finishedAt: null, reward: null,
  });
  assert.deepEqual([byId['b-web'].finishedAt, byId['b-web'].reward], ['2026-10-10T16:00:00.000Z', 'Movie night with popcorn']);
  assert.equal(byId['b-other'].householdId, 'h2');
});

test('Given GET a book’s logs, then they are listed in chapter order with review status', async () => {
  const db = await seededDb();
  const { status, body } = await call(db, 'GET', '/api/admin/v1/books/b-lion/logs', { token: await tokenFor(db, ['read']) });

  assert.equal(status, 200);
  assert.deepEqual(body.map((l: { chapter: number }) => l.chapter), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.deepEqual(body[0], {
    id: 'b-lion-c1', chapter: 1, readOn: '2026-10-15', loggedAt: '2026-10-15T16:00:00.000Z', reviewedAt: '2026-10-15T16:00:00.000Z', sticker: 'star',
  });
  assert.deepEqual([body[10].reviewedAt, body[10].sticker], [null, null]);
});

test('Given GET a log, then its book, review, note and every question with its answer are returned', async () => {
  const db = await seededDb();
  const { body } = await call(db, 'GET', '/api/admin/v1/logs/b-lion-c1', { token: await tokenFor(db, ['read']) });

  assert.deepEqual(body, {
    id: 'b-lion-c1', bookId: 'b-lion', bookTitle: 'The Lion, the Witch and the Wardrobe', chapter: 1, readOn: '2026-10-15',
    loggedAt: '2026-10-15T16:00:00.000Z', reviewedAt: '2026-10-15T16:00:00.000Z', sticker: 'star', note: 'Lovely work!',
    answers: [{ position: 1, question: 'What happened in this chapter?', text: 'Lucy found a wardrobe in the empty room and went inside.' }],
  });
});

test('Given an unknown book or log id, then 404 not-found; given a malformed id, then 400 validation', async () => {
  const db = await seededDb();
  const token = await tokenFor(db, ['read']);
  for (const path of ['/api/admin/v1/logs/nope', '/api/admin/v1/books/nope/logs']) {
    const response = await call(db, 'GET', path, { token });
    assert.deepEqual([response.status, response.body.type], [404, 'not-found'], path);
    assert.ok(response.body.requestId);
  }
  const malformed = await call(db, 'GET', '/api/admin/v1/logs/bad%20id!', { token });
  assert.deepEqual([malformed.status, malformed.body.type, malformed.body.errors[0].field], [400, 'validation', 'id']);
});

test('Given a call with a target id, then the audit row keeps the id and nothing records the answers', async () => {
  const db = await seededDb();
  const response = await call(db, 'GET', '/api/admin/v1/logs/b-lion-c1', { token: await tokenFor(db, ['read']) });

  const [row] = await auditRows(db);
  assert.deepEqual([row['route'], row['target_id']], ['/api/admin/v1/logs/:id', 'b-lion-c1']);
  const logged = JSON.stringify(response.lines);
  assert.ok(!logged.includes('b-lion-c1'), 'the request log has the route pattern only');
  assert.ok(!JSON.stringify([row, response.lines]).includes('Lucy found a wardrobe'), 'answers are never recorded');
});
