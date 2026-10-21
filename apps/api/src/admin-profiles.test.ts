// Traces to: L2-168, L2-052, L2-178
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { auditRows, call, seededDb, tokenFor } from './admin-test-api.ts';
import { join } from './auth.service.ts';
import { all, get, run } from './db.ts';
import { SEED } from './seed.ts';

/** Rosa (an author with one catalogue book) and Sam (a volunteer), as they wrote their profiles; returns their ids. */
async function withDirectory(db: Pool) {
  await join(db, { kind: 'author', name: 'Rosa Delgado', email: 'rosa@example.com', username: 'rosawrites', password: 'lighthouse-fox' });
  await join(db, { kind: 'volunteer', name: 'Sam Okafor', email: 'sam@example.com', username: 'samreads', password: 'patient-reader' });
  const ids = Object.fromEntries((await all<{ username: string; id: string }>(db, "SELECT username, id FROM profile WHERE household_id IS NULL")).map((r) => [r.username, r.id]));
  await run(db, "UPDATE directory_profile SET bio = 'I write adventure stories.', website = 'https://rosadelgado.example.com' WHERE profile_id = $1", [ids['rosawrites']]);
  await run(db, "UPDATE directory_profile SET bio = 'Retired Year 3 teacher.', ages = 'Ages 6 to 10', contact = 'sam@example.com' WHERE profile_id = $1", [ids['samreads']]);
  await run(db, "INSERT INTO catalogue_book (id, profile_id, title, chapter_count, created_at) VALUES ('cb-fox', $1, 'The Lighthouse Fox', 12, '2026-10-19T09:00:00.000Z')", [ids['rosawrites']]);
  return { rosa: ids['rosawrites']!, sam: ids['samreads']! };
}

const statusOf = async (db: Pool, id: string) => (await get<{ status: string }>(db, 'SELECT status FROM directory_profile WHERE profile_id = $1', [id]))!.status;

test('Given GET profiles with a read token, then every author and volunteer is listed with what they wrote, their status and an author’s book count', async () => {
  const db = await seededDb();
  const { rosa, sam } = await withDirectory(db);

  const response = await call(db, 'GET', '/api/admin/v1/profiles', { token: await tokenFor(db, ['read']) });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, [
    { id: rosa, kind: 'author', name: 'Rosa Delgado', email: 'rosa@example.com', status: 'pending', bio: 'I write adventure stories.', website: 'https://rosadelgado.example.com', ages: null, contact: null, bookCount: 1 },
    { id: sam, kind: 'volunteer', name: 'Sam Okafor', email: 'sam@example.com', status: 'pending', bio: 'Retired Year 3 teacher.', website: null, ages: 'Ages 6 to 10', contact: 'sam@example.com', bookCount: 0 },
  ]);
});

test('Given approve and then hide with a write token, then the profile is approved and then hidden', async () => {
  const db = await seededDb();
  const { rosa } = await withDirectory(db);
  const token = await tokenFor(db);

  const approved = await call(db, 'POST', `/api/admin/v1/profiles/${rosa}/approve`, { token });

  assert.equal(approved.status, 200);
  assert.deepEqual(approved.body, { id: rosa, name: 'Rosa Delgado', kind: 'author', status: 'approved', dryRun: false });
  assert.equal(await statusOf(db, rosa), 'approved');

  const hidden = await call(db, 'POST', `/api/admin/v1/profiles/${rosa}/hide`, { token });

  assert.deepEqual(hidden.body, { id: rosa, name: 'Rosa Delgado', kind: 'author', status: 'hidden', dryRun: false });
  assert.equal(await statusOf(db, rosa), 'hidden');
});

test('Given a dry run, then the answer previews the change and nothing changes', async () => {
  const db = await seededDb();
  const { sam } = await withDirectory(db);

  const response = await call(db, 'POST', `/api/admin/v1/profiles/${sam}/approve?dryRun=true`, { token: await tokenFor(db) });

  assert.deepEqual(response.body, { id: sam, name: 'Sam Okafor', kind: 'volunteer', status: 'approved', dryRun: true });
  assert.equal(await statusOf(db, sam), 'pending');
});

test('Given a parent’s or a reader’s id, then 400 not-a-directory-profile; given an unknown id, 404 not-found; nothing changes', async () => {
  const db = await seededDb();
  await withDirectory(db);
  const token = await tokenFor(db);

  for (const id of [SEED.parentId, SEED.readerId]) {
    const response = await call(db, 'POST', `/api/admin/v1/profiles/${id}/approve`, { token });
    assert.equal(response.status, 400);
    assert.equal(response.body.type, 'not-a-directory-profile');
  }
  const unknown = await call(db, 'POST', '/api/admin/v1/profiles/p-nobody/hide', { token });
  assert.equal(unknown.status, 404);
  assert.equal(unknown.body.type, 'not-found');
  assert.deepEqual((await all<{ status: string }>(db, 'SELECT status FROM directory_profile')).map((r) => r.status), ['pending', 'pending']);
});

test('Given a read-only token, then approve and hide answer 403 scope-missing; without a token, 401', async () => {
  const db = await seededDb();
  const { rosa } = await withDirectory(db);
  const read = await tokenFor(db, ['read']);

  for (const action of ['approve', 'hide']) {
    const response = await call(db, 'POST', `/api/admin/v1/profiles/${rosa}/${action}`, { token: read });
    assert.equal(response.status, 403);
    assert.equal(response.body.type, 'scope-missing');
  }
  assert.equal((await call(db, 'GET', '/api/admin/v1/profiles')).status, 401);
  assert.equal(await statusOf(db, rosa), 'pending');
});

test('Given each profile call, then one audit row records the route and target, and neither the audit nor the log holds what the profile says', async () => {
  const db = await seededDb();
  const { rosa } = await withDirectory(db);
  const token = await tokenFor(db);

  const listed = await call(db, 'GET', '/api/admin/v1/profiles', { token });
  const approved = await call(db, 'POST', `/api/admin/v1/profiles/${rosa}/approve`, { token });

  const rows = await auditRows(db);
  assert.deepEqual(
    rows.map((r) => [r['method'], r['route'], r['target_id'], r['status']]),
    [
      ['GET', '/api/admin/v1/profiles', null, 200],
      ['POST', '/api/admin/v1/profiles/:id/approve', rosa, 200],
    ],
  );
  const recorded = JSON.stringify([rows, listed.lines, approved.lines]);
  for (const text of ['adventure stories', 'rosadelgado.example.com', 'Retired Year 3', 'Ages 6 to 10', 'sam@example.com', 'Rosa Delgado']) {
    assert.ok(!recorded.includes(text), `${text} is never recorded`);
  }
});
