// Traces to: L2-049
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { all } from './db.ts';
import { createTestDatabase } from './test-db.ts';

const script = fileURLToPath(new URL('./admin-token.ts', import.meta.url));
const databases: Awaited<ReturnType<typeof createTestDatabase>>[] = [];
after(() => Promise.all(databases.map((database) => database.drop())));

type TestDatabase = Awaited<ReturnType<typeof freshDb>>;

async function freshDb() {
  const database = await createTestDatabase();
  databases.push(database);
  return database;
}

function adminToken(db: TestDatabase, ...args: string[]) {
  const run = spawnSync(process.execPath, [script, ...args], { env: { ...process.env, DATABASE_URL: db.url }, encoding: 'utf8' });
  return { status: run.status, stdout: run.stdout, stderr: run.stderr };
}

const rows = (db: TestDatabase) => all<Record<string, string | null>>(db.pool, 'SELECT * FROM admin_token');

test('Given create with a name, scopes and days, then the token is printed once and only its hash is stored', async () => {
  const db = await freshDb();
  const run = adminToken(db, 'create', '--name', 'laptop', '--scopes', 'read,write', '--days', '7');

  assert.equal(run.status, 0);
  const token = /shfa_[A-Za-z0-9_-]{43}/.exec(run.stdout)?.[0];
  assert.ok(token, 'the token is printed');
  const [row] = await rows(db);
  assert.equal(row['name'], 'laptop');
  assert.equal(row['scopes'], 'read write');
  assert.equal(row['token_hash'], createHash('sha256').update(token).digest('hex'));
  assert.ok(!JSON.stringify(row).includes(token), 'the token itself is not stored');
  const days = (Date.parse(row['expires_at']!) - Date.parse(row['created_at']!)) / 86_400_000;
  assert.equal(Math.round(days), 7);
});

test('Given no --days, then the token expires 30 days after creation', async () => {
  const db = await freshDb();
  assert.equal(adminToken(db, 'create', '--name', 'laptop', '--scopes', 'read').status, 0);
  const [row] = await rows(db);
  assert.equal(row['scopes'], 'read');
  assert.equal(Math.round((Date.parse(row['expires_at']!) - Date.parse(row['created_at']!)) / 86_400_000), 30);
});

for (const [option, args] of [
  ['--name', ['--name', '', '--scopes', 'read']],
  ['--name', ['--name', 'x'.repeat(41), '--scopes', 'read']],
  ['--scopes', ['--name', 'laptop', '--scopes', 'write']],
  ['--scopes', ['--name', 'laptop', '--scopes', 'admin']],
  ['--days', ['--name', 'laptop', '--scopes', 'read', '--days', '0']],
  ['--days', ['--name', 'laptop', '--scopes', 'read', '--days', '91']],
] as const) {
  test(`Given an invalid ${option} (${args.join(' ')}), then the script exits non-zero naming it and stores nothing`, async () => {
    const db = await freshDb();
    const run = adminToken(db, 'create', ...args);
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, new RegExp(option));
    assert.equal((await rows(db)).length, 0);
  });
}

test('Given list, then each token is shown without its value or hash; Given revoke, then its revocation time is set', async () => {
  const db = await freshDb();
  const token = /shfa_\S+/.exec(adminToken(db, 'create', '--name', 'laptop', '--scopes', 'read').stdout)![0];
  const [row] = await rows(db);

  assert.equal(adminToken(db, 'revoke', String(row['id'])).status, 0);
  const list = adminToken(db, 'list');

  assert.equal(list.status, 0);
  for (const shown of [String(row['id']), 'laptop', 'read', String(row['expires_at']), 'revoked']) assert.ok(list.stdout.includes(shown), shown);
  assert.ok(!list.stdout.includes(token));
  assert.ok(!list.stdout.includes(String(row['token_hash'])));
  assert.ok((await rows(db))[0]['revoked_at']);
});

test('Given revoke with an unknown id, then the script exits non-zero', async () => {
  assert.notEqual(adminToken(await freshDb(), 'revoke', 'tok_nope').status, 0);
});
