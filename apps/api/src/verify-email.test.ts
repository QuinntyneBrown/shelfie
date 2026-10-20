// Traces to: L2-144, L2-145, L2-146, L2-147, L2-149, L2-152
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { sha256 } from './auth.service.ts';
import { all } from './db.ts';
import { seed, SEED } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie', 'Content-Type': 'application/json' };
const NEW_PARENT = { name: 'Marcus', email: 'marcus@example.com', username: 'marcus', password: 'reading-is-fun-9' };
interface Sent {
  to: string;
  subject: string;
  text: string;
  html: string;
}
const outbox: Sent[] = [];
const logged: Record<string, unknown>[] = [];
let mailFails = false;
let db: Awaited<ReturnType<typeof createTestDatabase>>;
let server: Server;
let url: string;

before(async () => {
  db = await createTestDatabase();
  const mail = async (to: string, subject: string, text: string, html: string) => {
    if (mailFails) throw new Error(`SMTP refused ${to}`);
    outbox.push({ to, subject, text, html });
  };
  server = createApp(db.pool, { push: null, log: (line) => void logged.push(line), mail }).listen(0);
  url = `http://localhost:${(server.address() as { port: number }).port}`;
  process.env.APP_URL = 'https://app.shelfie.kids';
});

after(async () => {
  server.close();
  await db.drop();
});

beforeEach(async () => {
  await seed(db.pool);
  outbox.length = 0;
  logged.length = 0;
  mailFails = false;
});

const post = (path: string, body: unknown, cookie = '') =>
  fetch(`${url}/api${path}`, { method: 'POST', headers: { ...APP, Cookie: cookie }, body: JSON.stringify(body) });
const cookieOf = (response: Response) => response.headers.get('set-cookie')!.split(';')[0]!;
const tokenIn = (mail: Sent) => mail.text.match(/https:\/\/app\.shelfie\.kids\/verify-email\?token=(\S+)/)?.[1];
const until = async (done: () => boolean) => {
  for (let i = 0; i < 100 && !done(); i++) await new Promise((r) => setTimeout(r, 10));
};

test('Given a parent signs up, then a confirm mail with a one-day link goes to their address and only the token hash is stored', async () => {
  const response = await post('/auth/sign-up', NEW_PARENT);

  assert.equal(response.status, 201);
  assert.equal((await response.json()).emailVerified, false);
  await until(() => outbox.length > 0);
  assert.equal(outbox.length, 1);
  const [mail] = outbox;
  assert.equal(mail.to, NEW_PARENT.email);
  assert.equal(mail.subject, 'Confirm your e-mail for Shelfie');
  assert.match(mail.text, /Hi Marcus, welcome to Shelfie! Tap the button to confirm this address is yours\. The link works once, for 24 hours\./);
  assert.match(mail.html, />Confirm my e-mail<\/a>/);
  const token = tokenIn(mail)!;
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);

  const rows = await all<{ token_hash: string; expires_at: string; used_at: string | null }>(db.pool, 'SELECT token_hash, expires_at, used_at FROM email_verification');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].token_hash, sha256(token));
  assert.equal(rows[0].used_at, null);
  const hours = (Date.parse(rows[0].expires_at) - Date.now()) / 3_600_000;
  assert.ok(hours > 23.9 && hours <= 24, `expires in ${hours} hours`);
});

test('Given the confirm mail cannot be sent, when a parent signs up, then sign-up still succeeds and the failure is logged without the token or address', async () => {
  mailFails = true;
  const response = await post('/auth/sign-up', NEW_PARENT);

  assert.equal(response.status, 201);
  assert.equal((await fetch(`${url}/api/auth/session`, { headers: { Cookie: cookieOf(response) } })).status, 200);
  await until(() => logged.some((line) => line['event'] === 'verify-mail-failed'));
  const failure = logged.find((line) => line['event'] === 'verify-mail-failed');
  assert.ok(failure, 'the failure is logged');
  const all = JSON.stringify(logged);
  assert.doesNotMatch(all, /marcus@example\.com/);
  const [{ token_hash }] = await (await import('./db.ts')).all<{ token_hash: string }>(db.pool, 'SELECT token_hash FROM email_verification');
  assert.doesNotMatch(all, new RegExp(token_hash));
  assert.doesNotMatch(all, /verify-email\?token=/);
});

test('Given a parent from before this release, when they sign in, then the session says their e-mail is verified', async () => {
  const response = await post('/auth/password', { username: SEED.parentUsername, password: SEED.parentPassword, remember: true });
  assert.equal((await response.json()).emailVerified, true);
  const session = await fetch(`${url}/api/auth/session`, { headers: { Cookie: cookieOf(response) } });
  assert.equal((await session.json()).emailVerified, true);
});

async function signUpAndTakeToken() {
  const response = await post('/auth/sign-up', NEW_PARENT);
  await until(() => outbox.length > 0);
  return { cookie: cookieOf(response), token: tokenIn(outbox.at(-1)!)! };
}

test('Given a live confirm link, when it is posted, then the address is verified, the link is spent and no cookie is set or cleared', async () => {
  const { cookie, token } = await signUpAndTakeToken();

  const response = await post('/auth/verify-email', { token });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { email: NEW_PARENT.email });
  assert.equal(response.headers.get('set-cookie'), null);
  const session = await (await fetch(`${url}/api/auth/session`, { headers: { Cookie: cookie } })).json();
  assert.equal(session.emailVerified, true);
  const [row] = await all<{ used_at: string | null }>(db.pool, 'SELECT used_at FROM email_verification');
  assert.ok(row.used_at);
});

test('Given a used, expired or unknown confirm link, when it is posted, then the API answers verify-token-invalid and nothing changes', async () => {
  const { cookie, token } = await signUpAndTakeToken();
  await post('/auth/verify-email', { token });
  await db.pool.query('UPDATE profile SET email_verified_at = NULL WHERE username = $1', [NEW_PARENT.username]);

  const used = await post('/auth/verify-email', { token });
  assert.equal(used.status, 400);
  assert.deepEqual(await used.json(), { type: 'verify-token-invalid' });

  await db.pool.query('UPDATE email_verification SET used_at = NULL, expires_at = $1', ['2020-01-01T00:00:00.000Z']);
  assert.equal((await post('/auth/verify-email', { token })).status, 400);
  assert.equal((await post('/auth/verify-email', { token: 'not-a-token' })).status, 400);
  assert.equal((await post('/auth/verify-email', {})).status, 400);

  const session = await (await fetch(`${url}/api/auth/session`, { headers: { Cookie: cookie } })).json();
  assert.equal(session.emailVerified, false);
});

const resend = (cookie: string) => post('/auth/verify-email/resend', {}, cookie);

test('Given an unverified parent, when they ask for the link again, then a fresh link is mailed and only the newest one works', async () => {
  const { cookie, token: first } = await signUpAndTakeToken();

  const response = await resend(cookie);

  assert.equal(response.status, 204);
  assert.equal(outbox.length, 2);
  assert.equal(outbox[1].to, NEW_PARENT.email);
  const second = tokenIn(outbox[1])!;
  assert.notEqual(second, first);
  assert.equal((await post('/auth/verify-email', { token: first })).status, 400);
  assert.equal((await post('/auth/verify-email', { token: second })).status, 200);
});

test('Given a parent has asked three times in ten minutes, when they ask again, then the API answers 429 and sends nothing', async () => {
  const { cookie } = await signUpAndTakeToken();
  for (let i = 0; i < 3; i++) assert.equal((await resend(cookie)).status, 204);

  const fourth = await resend(cookie);

  assert.equal(fourth.status, 429);
  assert.equal((await fourth.json()).type, 'too-many-attempts');
  assert.equal(outbox.length, 4);
});

test('Given a verified parent, a reader or no session, when the resend endpoint is called, then nothing is sent', async () => {
  const dad = await post('/auth/password', { username: SEED.parentUsername, password: SEED.parentPassword, remember: true });
  assert.equal((await resend(cookieOf(dad))).status, 204);
  const nia = await post('/auth/password', { username: SEED.readerUsername, password: SEED.readerPassword, remember: true });
  assert.equal((await resend(cookieOf(nia))).status, 403);
  assert.equal((await resend('')).status, 401);
  assert.equal(outbox.length, 0);
});

