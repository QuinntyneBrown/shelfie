// Traces to: L2-144, L2-145, L2-146, L2-147, L2-148, L2-149
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { call, seededDb } from './admin-test-api.ts';
import { createApp } from './app.ts';
import { readCookie } from './session.ts';
import { get, run } from './db.ts';
import { configuredProviders } from './oauth.ts';
import { startFakeProvider, type FakeProvider } from './oauth-fake.ts';

const BOTH = { GOOGLE_CLIENT_ID: 'google-id', GOOGLE_CLIENT_SECRET: 'google-secret', FACEBOOK_CLIENT_ID: 'facebook-id', FACEBOOK_CLIENT_SECRET: 'facebook-secret' };

let provider: FakeProvider;
before(async () => (provider = await startFakeProvider()));
after(() => provider.close());

/** Serves an app with both providers aimed at the stand-in, for the whole of one test. */
async function serve(db: Awaited<ReturnType<typeof seededDb>>) {
  const app = createApp(db, { log: () => {}, providers: configuredProviders(BOTH, { google: provider.endpoints, facebook: provider.endpoints }) });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://localhost:${(server.address() as AddressInfo).port}`;
  process.env.APP_URL = url;
  const get = (path: string, cookie = '') => fetch(path.startsWith('http') ? path : `${url}${path}`, { redirect: 'manual', headers: cookie ? { cookie } : {} });
  const setCookie = (response: Response, name: string) => response.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));
  const cookieValue = (response: Response, name: string) => setCookie(response, name)?.split(';')[0] ?? '';
  return {
    url,
    app,
    get,
    setCookie,
    cookieValue,
    /** Starts with the provider and comes back through the stand-in, as a browser would; answers the callback response. */
    async roundTrip(name: 'google' | 'facebook', query = 'from=sign-in', { state }: { state?: string } = {}) {
      const start = await get(`/api/auth/${name}/start?${query}`);
      assert.equal(start.status, 302, 'start redirects');
      const oauth = cookieValue(start, 'shelfie_oauth');
      const consent = await get(start.headers.get('location')!);
      assert.equal(consent.status, 302, 'the provider sends the browser back');
      const back = new URL(consent.headers.get('location')!);
      if (state !== undefined) back.searchParams.set('state', state);
      return { start, callback: await get(back.pathname + back.search, oauth) };
    },
    close: () => new Promise<void>((resolve) => (server.closeAllConnections(), server.close(() => resolve()))),
  };
}

test('Given both providers are configured, when the providers are asked for, then both names come back and nothing else', async () => {
  const db = await seededDb();
  const app = createApp(db, { log: () => {}, providers: configuredProviders(BOTH) });

  const response = await call(db, 'GET', '/api/auth/providers', { app });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { providers: ['google', 'facebook'] });
  assert.ok(!response.text.includes('secret') && !response.text.includes('google-id'));
});

test('Given only Google has both values and Facebook lacks its secret, then only Google is configured', () => {
  assert.deepEqual(configuredProviders({ ...BOTH, FACEBOOK_CLIENT_SECRET: '' }).map((p) => p.name), ['google']);
  assert.deepEqual(configuredProviders({}), []);
});

test('Given a start request, then it redirects to the provider with state and an S256 challenge, and keeps both in a short-lived HttpOnly Lax cookie', async () => {
  const site = await serve(await seededDb());
  try {
    const start = await site.get('/api/auth/google/start?from=sign-in');

    assert.equal(start.status, 302);
    const to = new URL(start.headers.get('location')!);
    assert.equal(to.origin + to.pathname, provider.endpoints.authorizeUrl);
    assert.equal(to.searchParams.get('client_id'), 'google-id');
    assert.equal(to.searchParams.get('redirect_uri'), `${site.url}/api/auth/google/callback`);
    assert.equal(to.searchParams.get('response_type'), 'code');
    assert.equal(to.searchParams.get('scope'), 'openid email profile');
    assert.equal(to.searchParams.get('code_challenge_method'), 'S256');
    assert.ok(to.searchParams.get('state')!.length >= 22, 'state has at least 128 bits');
    assert.ok(to.searchParams.get('code_challenge')!.length >= 43);
    const cookie = site.setCookie(start, 'shelfie_oauth')!;
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Max-Age=600/);
    assert.match(cookie, /Path=\/api\/auth/);
    assert.ok(!cookie.includes('google-secret'));
  } finally {
    await site.close();
  }
});

test('Given Dad’s e-mail is what Google vouches for, when the round trip completes, then the callback sets the session cookie, opens the app and the session is Dad’s', async () => {
  const site = await serve(await seededDb());
  try {
    provider.answer({ email: 'dad@example.com', name: 'Dad', verified: true });

    const { callback } = await site.roundTrip('google');

    assert.equal(callback.status, 302);
    assert.equal(callback.headers.get('location'), '/');
    const session = site.cookieValue(callback, 'shelfie_session');
    assert.ok(session, 'a session cookie is set');
    assert.match(site.setCookie(callback, 'shelfie_oauth')!, /Expires=Thu, 01 Jan 1970/, 'the start cookie is cleared');
    const me = await site.get('/api/auth/session', session);
    assert.equal(me.status, 200);
    assert.equal((await me.json()).username, 'dad');
    assert.ok(!callback.headers.get('location')!.includes('token'));
  } finally {
    await site.close();
  }
});

test('Given the callback’s state is not the one in the cookie, then no code is exchanged, no session is set and the parent is returned with failed', async () => {
  const site = await serve(await seededDb());
  try {
    provider.answer({ email: 'dad@example.com', name: 'Dad', verified: true });

    const { callback } = await site.roundTrip('google', 'from=sign-in', { state: 'not-the-state' });

    assert.equal(callback.status, 302);
    assert.equal(callback.headers.get('location'), '/sign-in?reason=failed&provider=google');
    assert.equal(site.setCookie(callback, 'shelfie_session'), undefined);
  } finally {
    await site.close();
  }
});

test('Given no start cookie at all, when the callback is called, then it is refused the same way', async () => {
  const site = await serve(await seededDb());
  try {
    const callback = await site.get('/api/auth/google/callback?code=x&state=y');
    assert.equal(callback.headers.get('location'), '/sign-in?reason=failed&provider=google');
    assert.equal(readCookie(callback.headers.get('set-cookie') ?? '', 'shelfie_session'), null);
  } finally {
    await site.close();
  }
});

test('Given an e-mail nobody has, when the round trip completes, then a household starts with one parent from the provider’s name and e-mail, a generated username and no password', async () => {
  const db = await seededDb();
  const site = await serve(db);
  try {
    provider.answer({ email: 'Priya.Bell@Example.com', name: 'Priya Bell', verified: true });

    const { callback } = await site.roundTrip('google', 'from=sign-up');

    assert.equal(callback.headers.get('location'), '/');
    const parent = (await get<{ name: string; username: string; email: string; role: string; password_hash: string | null; household_id: string }>(db, "SELECT name, username, email, role, password_hash, household_id FROM profile WHERE email = 'priya.bell@example.com'"))!;
    assert.deepEqual([parent.name, parent.username, parent.role, parent.password_hash], ['Priya Bell', 'priya.bell', 'parent', null]);
    assert.notEqual(parent.household_id, 'h1');
    assert.equal((await get<{ onboarded: boolean }>(db, 'SELECT onboarded FROM household WHERE id = $1', [parent.household_id]))!.onboarded, false, 'the new household goes through the set-up wizard');
    assert.equal((await get<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM profile WHERE household_id = $1', [parent.household_id]))!.n, 1);
    const me = await site.get('/api/auth/session', site.cookieValue(callback, 'shelfie_session'));
    assert.equal((await me.json()).name, 'Priya Bell');
  } finally {
    await site.close();
  }
});

test('Given the provider sends no name and a local part that is taken, too short or odd, then the name falls back to the local part and the username is made free and well-formed', async () => {
  const db = await seededDb();
  const site = await serve(db);
  try {
    for (const [email, username, name] of [
      ['dad@other.example.com', 'dad2', 'dad'],
      ['ab@example.com', 'ab_', 'ab'],
      ['Jo Ann+Reads!@example.com', 'joannreads', 'Jo Ann+Reads!'],
      ['averyveryverylongemailaddress@example.com', 'averyveryverylongema', 'averyveryverylongemailaddress'],
    ]) {
      provider.answer({ email, name: null, verified: true });
      const { callback } = await site.roundTrip('google');
      assert.equal(callback.headers.get('location'), '/', email);
      const row = (await get<{ username: string; name: string }>(db, 'SELECT username, name FROM profile WHERE email = $1', [email.toLowerCase()]))!;
      assert.deepEqual([row.username, row.name], [username, name], email);
    }
  } finally {
    await site.close();
  }
});

test('Given Dad signed in with Google once, when Google later reports another e-mail for the same account, then the link still signs Dad in', async () => {
  const db = await seededDb();
  const site = await serve(db);
  try {
    provider.answer({ subject: 'google-dad', email: 'dad@example.com', name: 'Dad', verified: true });
    const first = await site.roundTrip('google');
    assert.equal(first.callback.headers.get('location'), '/');
    const link = await get<{ profile_id: string }>(db, "SELECT profile_id FROM profile_provider WHERE provider = 'google' AND subject = 'google-dad'");
    assert.equal(link?.profile_id, 'p-dad', 'the first sign-in by e-mail links the account');

    provider.answer({ subject: 'google-dad', email: 'dad.new@example.com', name: 'Dad', verified: true });
    const second = await site.roundTrip('google');

    assert.equal(second.callback.headers.get('location'), '/');
    const me = await site.get('/api/auth/session', site.cookieValue(second.callback, 'shelfie_session'));
    assert.equal((await me.json()).username, 'dad');
    assert.equal(await get(db, "SELECT 1 FROM profile WHERE email = 'dad.new@example.com'"), undefined, 'no second account is created');
  } finally {
    await site.close();
  }
});

test('Given Dad is linked to Google, when he continues with Facebook with the same verified e-mail, then the same Dad signs in and Facebook is linked too', async () => {
  const db = await seededDb();
  const site = await serve(db);
  try {
    provider.answer({ subject: 'google-dad', email: 'dad@example.com', name: 'Dad', verified: true });
    await site.roundTrip('google');
    provider.answer({ subject: 'facebook-dad', email: 'dad@example.com', name: 'Dad', verified: true });

    const { callback } = await site.roundTrip('facebook');

    assert.equal(callback.headers.get('location'), '/');
    const me = await site.get('/api/auth/session', site.cookieValue(callback, 'shelfie_session'));
    assert.equal((await me.json()).username, 'dad');
    const links = await get<{ n: number }>(db, "SELECT COUNT(*) AS n FROM profile_provider WHERE profile_id = 'p-dad'");
    assert.equal(links?.n, 2);
  } finally {
    await site.close();
  }
});

test('Given a reader’s e-mail, an unverified e-mail, a missing e-mail, a cancelled consent or a provider error, then the parent goes back to the page they started from with the reason and no session or new rows', async () => {
  const db = await seededDb();
  const site = await serve(db);
  try {
    await run(db, "UPDATE profile SET email = 'nia@example.com' WHERE id = 'p-nia'");
    const cases: [() => void, string, string][] = [
      [() => provider.answer({ email: 'nia@example.com', name: 'Nia', verified: true }), 'sign-in', 'reader'],
      [() => provider.answer({ email: 'new@example.com', name: 'New', verified: false }), 'sign-up', 'no-email'],
      [() => provider.answer({ email: null, name: 'New', verified: false }), 'sign-in', 'no-email'],
      [() => provider.cancel(), 'sign-up', 'cancelled'],
      [() => provider.fail(), 'sign-in', 'failed'],
    ];
    const profiles = (await get<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM profile'))!.n;
    for (const [arrange, from, reason] of cases) {
      arrange();
      const { callback } = await site.roundTrip('google', `from=${from}`);
      assert.equal(callback.headers.get('location'), `/${from}?reason=${reason}&provider=google`, reason);
      assert.equal(site.setCookie(callback, 'shelfie_session'), undefined, reason);
    }
    assert.equal((await get<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM profile'))!.n, profiles);
    assert.equal((await get<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM profile_provider'))!.n, 0);
    assert.equal((await get<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM session'))!.n, 0);
  } finally {
    await site.close();
  }
});

test('Given remember=0 on the start request, then the session cookie has no Max-Age; given remember=1 or sign-up, then it lasts 30 days', async () => {
  const db = await seededDb();
  const site = await serve(db);
  try {
    provider.answer({ email: 'dad@example.com', name: 'Dad', verified: true });
    const forgotten = await site.roundTrip('google', 'remember=0&from=sign-in');
    assert.doesNotMatch(site.setCookie(forgotten.callback, 'shelfie_session')!, /Max-Age/);
    const remembered = await site.roundTrip('google', 'remember=1&from=sign-in');
    assert.match(site.setCookie(remembered.callback, 'shelfie_session')!, /Max-Age=2592000/);
    const signedUp = await site.roundTrip('google', 'from=sign-up');
    assert.match(site.setCookie(signedUp.callback, 'shelfie_session')!, /Max-Age=2592000/);
  } finally {
    await site.close();
  }
});

test('Given ten start or callback requests from one source in ten minutes, when an eleventh comes, then it is sent back with too-many and no password budget is spent', async () => {
  const db = await seededDb();
  const site = await serve(db);
  try {
    provider.cancel();
    for (let i = 0; i < 5; i++) {
      const { callback } = await site.roundTrip('google', 'from=sign-up');
      assert.equal(callback.headers.get('location'), '/sign-up?reason=cancelled&provider=google');
    }

    const eleventh = await site.get('/api/auth/google/start?from=sign-up');

    assert.equal(eleventh.status, 302);
    assert.equal(eleventh.headers.get('location'), '/sign-up?reason=too-many&provider=google');
    assert.equal(site.setCookie(eleventh, 'shelfie_oauth'), undefined, 'no round trip is started');
    const password = await fetch(`${site.url}/api/auth/password`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'Shelfie' }, body: JSON.stringify({ username: 'dad', password: 'sunny-days-42', remember: true }) });
    assert.equal(password.status, 200, 'the password limiter is separate');
  } finally {
    await site.close();
  }
});

test('Given Facebook, then the start asks for email and public_profile, the identity comes from /me and its id is the linked subject', async () => {
  const db = await seededDb();
  const site = await serve(db);
  try {
    provider.answer({ subject: 'fb-1001', email: 'priya@example.com', name: 'Priya Bell', verified: true });

    const { start, callback } = await site.roundTrip('facebook');

    assert.equal(new URL(start.headers.get('location')!).searchParams.get('scope'), 'email public_profile');
    assert.equal(callback.headers.get('location'), '/');
    const link = await get<{ profile_id: string }>(db, "SELECT profile_id FROM profile_provider WHERE provider = 'facebook' AND subject = 'fb-1001'");
    const parent = await get<{ id: string; name: string }>(db, "SELECT id, name FROM profile WHERE email = 'priya@example.com'");
    assert.equal(link?.profile_id, parent?.id);
    assert.equal(parent?.name, 'Priya Bell');
  } finally {
    await site.close();
  }
});
