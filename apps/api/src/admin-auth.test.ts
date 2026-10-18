// Traces to: L2-049, L2-050, L2-052, L2-053
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditRows, call, seededDb, tokenFor } from './admin-test-api.ts';
import { revokeAdminToken } from './admin-token.ts';
import { get, run } from './db.ts';
import { SEED } from './seed.ts';

test('Given a valid token, when whoami is called, then it answers with the token and the admin response headers', async () => {
  const db = await seededDb();
  const token = await tokenFor(db, ['read']);

  const response = await call(db, 'GET', '/api/admin/v1/whoami', { token });

  assert.equal(response.status, 200);
  assert.match(response.body.id, /^tok_[0-9a-f]{8}$/);
  assert.equal(response.body.name, 'test');
  assert.deepEqual(response.body.scopes, ['read']);
  assert.ok(Date.parse(response.body.expiresAt) > Date.now());
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.ok(!response.text.includes(token));
});

test('Given a call that passes, then the token last-use time is set', async () => {
  const db = await seededDb();
  const token = await tokenFor(db);
  await call(db, 'GET', '/api/admin/v1/whoami', { token });
  const { last_used_at } = (await get<{ last_used_at: string | null }>(db, 'SELECT last_used_at FROM admin_token'))!;
  assert.ok(last_used_at);
});

test('Given no Authorization header, then 401 token-missing with the request id', async () => {
  const response = await call(await seededDb(), 'GET', '/api/admin/v1/whoami');
  assert.equal(response.status, 401);
  assert.equal(response.body.type, 'token-missing');
  assert.equal(response.body.requestId, response.headers.get('x-request-id'));
});

test('Given a token that matches nothing, then 401 token-invalid', async () => {
  const response = await call(await seededDb(), 'GET', '/api/admin/v1/whoami', { token: `shfa_${'x'.repeat(43)}` });
  assert.equal(response.status, 401);
  assert.equal(response.body.type, 'token-invalid');
});

test('Given an expired token, then 401 token-expired with the expiry time', async () => {
  const db = await seededDb();
  const token = await tokenFor(db);
  await run(db, "UPDATE admin_token SET expires_at = '2026-01-01T00:00:00.000Z'");
  const response = await call(db, 'GET', '/api/admin/v1/whoami', { token });
  assert.equal(response.status, 401);
  assert.deepEqual([response.body.type, response.body.expiresAt], ['token-expired', '2026-01-01T00:00:00.000Z']);
});

test('Given a revoked token, then 401 token-revoked', async () => {
  const db = await seededDb();
  const token = await tokenFor(db);
  const { id } = (await get<{ id: string }>(db, 'SELECT id FROM admin_token'))!;
  await revokeAdminToken(db, id);
  const response = await call(db, 'GET', '/api/admin/v1/whoami', { token });
  assert.equal(response.status, 401);
  assert.equal(response.body.type, 'token-revoked');
});

test("Given a parent's web session and no token, then the admin API answers 401", async () => {
  const db = await seededDb();
  await run(db, "INSERT INTO session (id, profile_id, created_at, expires_at) VALUES ('web-session', $1, '2026-01-01', '2999-01-01')", [SEED.parentId]);
  const web = await call(db, 'GET', '/api/review', { cookie: 'shelfie_session=web-session' });
  assert.equal(web.status, 200, 'the session works on the web API');

  const admin = await call(db, 'GET', '/api/admin/v1/whoami', { cookie: 'shelfie_session=web-session' });
  assert.equal(admin.status, 401);
});

test('Given a valid admin token and no session, then a web endpoint answers 401', async () => {
  const db = await seededDb();
  const response = await call(db, 'GET', '/api/review', { token: await tokenFor(db) });
  assert.equal(response.status, 401);
});

test('Given served and refused admin calls, then each writes one audit row and no secret reaches the audit or the log', async () => {
  const db = await seededDb();
  const token = await tokenFor(db);
  const { id } = (await get<{ id: string }>(db, 'SELECT id FROM admin_token'))!;

  const served = await call(db, 'GET', '/api/admin/v1/whoami', { token });
  const refused = await call(db, 'GET', '/api/admin/v1/whoami', { token: 'shfa_wrong' });

  const rows = await await auditRows(db);
  assert.equal(rows.length, 2);
  assert.deepEqual(
    { token: rows[0]['token_id'], method: rows[0]['method'], route: rows[0]['route'], dryRun: rows[0]['dry_run'], status: rows[0]['status'], requestId: rows[0]['request_id'] },
    { token: id, method: 'GET', route: '/api/admin/v1/whoami', dryRun: 0, status: 200, requestId: served.headers.get('x-request-id') },
  );
  assert.ok(Date.parse(String(rows[0]['at'])));
  assert.deepEqual([rows[1]['token_id'], rows[1]['status'], rows[1]['request_id']], [null, 401, refused.headers.get('x-request-id')]);

  const { token_hash: hash } = (await get<{ token_hash: string }>(db, 'SELECT token_hash FROM admin_token'))!;
  const recorded = JSON.stringify([rows, served.lines, refused.lines]);
  for (const secret of [token, hash, 'shfa_wrong']) assert.ok(!recorded.includes(secret), 'no token or hash is recorded');
});
