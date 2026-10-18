// Traces to: L2-051, L2-052
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.ts';
import { auditRows, call, seededDb, tokenFor } from './admin-test-api.ts';

test('Given 60 admin calls in a minute, then the 61st is answered 429 with Retry-After and the next minute is served', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-10-18T12:00:00.000Z') });
  const db = await seededDb();
  const token = await tokenFor(db);
  const app = createApp(db, { log: () => {} });

  for (let i = 0; i < 60; i++) assert.equal((await call(db, 'GET', '/api/admin/v1/whoami', { token, app })).status, 200);
  const limited = await call(db, 'GET', '/api/admin/v1/whoami', { token, app });

  assert.equal(limited.status, 429);
  assert.equal(limited.body.type, 'too-many-requests');
  assert.equal(limited.headers.get('retry-after'), '60');
  assert.equal((await auditRows(db)).at(-1)?.['status'], 429, 'the refused call is audited');

  t.mock.timers.tick(60_000);
  assert.equal((await call(db, 'GET', '/api/admin/v1/whoami', { token, app })).status, 200);
});
