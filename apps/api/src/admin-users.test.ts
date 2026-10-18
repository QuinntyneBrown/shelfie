// Traces to: L2-052, L2-059, L2-062
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditRows, call, seededDb, tokenFor } from './admin-test-api.ts';
import { signInWithPassword } from './auth.service.ts';
import type { Pool } from 'pg';
import { get, run } from './db.ts';
import { SEED } from './seed.ts';

async function withSessions(db: Pool) {
  const add = (id: string, profileId: string) =>
    run(db, "INSERT INTO session (id, profile_id, created_at, expires_at) VALUES ($1, $2, '2026-01-01', '2999-01-01')", [id, profileId]);
  await add('dad-phone', SEED.parentId);
  await add('dad-laptop', SEED.parentId);
  await add('nia-tablet', SEED.readerId);
  return db;
}
const sessionsOf = async (db: Pool, profileId: string) => (await get<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM session WHERE profile_id = $1', [profileId]))!.n;

test("Given a parent, when a new password is set, then it replaces the old one and every session of that parent ends", async () => {
  const db = await withSessions(await seededDb());
  const response = await call(db, 'PUT', `/api/admin/v1/users/${SEED.parentId}/password`, { token: await tokenFor(db), body: { password: 'brand-new-pass' } });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { id: SEED.parentId, name: 'Dad', sessionsEnded: 2, dryRun: false });
  assert.equal(await sessionsOf(db, SEED.parentId), 0);
  assert.equal(await sessionsOf(db, SEED.readerId), 1, "the reader's session is untouched");
  assert.equal(await signInWithPassword(db, SEED.parentUsername, SEED.parentPassword, true), null, 'the old password no longer signs in');
  assert.ok(await signInWithPassword(db, SEED.parentUsername, 'brand-new-pass', true));
});

test('Given a dry run, then the password and the sessions stay', async () => {
  const db = await withSessions(await seededDb());
  const response = await call(db, 'PUT', `/api/admin/v1/users/${SEED.parentId}/password?dryRun=true`, { token: await tokenFor(db), body: { password: 'brand-new-pass' } });

  assert.deepEqual([response.status, response.body.sessionsEnded, response.body.dryRun], [200, 2, true]);
  assert.equal(await sessionsOf(db, SEED.parentId), 2);
  assert.ok(await signInWithPassword(db, SEED.parentUsername, SEED.parentPassword, true));
});

test("Given a reader's id, then the change is refused with not-a-parent", async () => {
  const db = await seededDb();
  const response = await call(db, 'PUT', `/api/admin/v1/users/${SEED.readerId}/password`, { token: await tokenFor(db), body: { password: 'brand-new-pass' } });
  assert.deepEqual([response.status, response.body.type], [400, 'not-a-parent']);
});

test('Given a password under 8 characters, then 400 validation and nothing changes', async () => {
  const db = await seededDb();
  const response = await call(db, 'PUT', `/api/admin/v1/users/${SEED.parentId}/password`, { token: await tokenFor(db), body: { password: 'short' } });
  assert.deepEqual([response.status, response.body.errors[0].field], [400, 'password']);
  assert.ok(await signInWithPassword(db, SEED.parentUsername, SEED.parentPassword, true));
});

test('Given a password change, then the password reaches neither the audit row nor the log', async () => {
  const db = await seededDb();
  const response = await call(db, 'PUT', `/api/admin/v1/users/${SEED.parentId}/password`, { token: await tokenFor(db), body: { password: 'brand-new-pass' } });
  assert.equal((await await auditRows(db))[0]['route'], '/api/admin/v1/users/:id/password');
  assert.ok(!JSON.stringify([await auditRows(db), response.lines]).includes('brand-new-pass'));
});
