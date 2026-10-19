// Traces to: L2-118
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditRows, call, seededDb, tokenFor } from './admin-test-api.ts';

test('Given GET feedback with a read token, then every household’s feedback is listed newest first without the sender’s name', async () => {
  const db = await seededDb();
  const response = await call(db, 'GET', '/api/admin/v1/feedback', { token: await tokenFor(db, ['read']) });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, [
    { id: 'fb-zeds-dad', createdAt: '2026-10-17T19:30:00.000Z', householdId: 'h2', role: 'parent', kind: 'idea', score: null, message: 'A weekly e-mail of what Zed read would be handy.' },
    { id: 'fb-nia', createdAt: '2026-10-16T17:05:00.000Z', householdId: 'h1', role: 'reader', kind: 'feel', score: 5, message: 'I love the stickers!' },
  ]);
});

test('Given no token, then GET feedback is refused; every call is audited without the message', async () => {
  const db = await seededDb();
  assert.equal((await call(db, 'GET', '/api/admin/v1/feedback')).status, 401);

  const read = await call(db, 'GET', '/api/admin/v1/feedback', { token: await tokenFor(db, ['read']) });

  const rows = await auditRows(db);
  assert.ok(rows.some((r) => r['route'] === '/api/admin/v1/feedback' && r['status'] === 200));
  assert.ok(!JSON.stringify([rows, read.lines]).includes('stickers'), 'the message is never recorded');
});
