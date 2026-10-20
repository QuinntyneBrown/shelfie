// Traces to: L2-161, L2-162, L2-163, L2-175, L2-176
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import sharp from 'sharp';
import { createApp } from './app.ts';
import { run } from './db.ts';
import { seed, SEED } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie' };
const JSON_APP = { ...APP, 'Content-Type': 'application/json' };
let db: Awaited<ReturnType<typeof createTestDatabase>>;
let server: Server;
let url: string;

before(async () => {
  db = await createTestDatabase();
  server = createApp(db.pool, { log: () => {} }).listen(0);
  url = `http://localhost:${(server.address() as { port: number }).port}`;
});

after(async () => {
  server.close();
  await db.drop();
});

async function joinAs(kind: 'author' | 'volunteer') {
  const name = kind === 'author' ? 'Rosa Delgado' : 'Sam Okafor';
  const response = await fetch(`${url}/api/auth/join`, {
    method: 'POST',
    headers: JSON_APP,
    body: JSON.stringify({ kind, name, email: `${kind}@example.com`, username: `${kind}1`, password: 'long-enough-1' }),
  });
  return response.headers.get('set-cookie')!.split(';')[0]!;
}

async function signIn(username: string, password: string) {
  const response = await fetch(`${url}/api/auth/password`, { method: 'POST', headers: JSON_APP, body: JSON.stringify({ username, password, remember: true }) });
  return response.headers.get('set-cookie')!.split(';')[0]!;
}

const me = (cookie: string) => fetch(`${url}/api/me`, { headers: { Cookie: cookie } });
const save = (cookie: string, body: object) => fetch(`${url}/api/me`, { method: 'PUT', headers: { ...JSON_APP, Cookie: cookie }, body: JSON.stringify(body) });
const ROSA_PROFILE = { name: 'Rosa Delgado', bio: 'I write adventure stories for readers aged 7 to 11.', website: 'https://rosadelgado.example.com' };

test('Given Rosa joined, when she reads her profile, then it is an empty author profile waiting for approval', async () => {
  await seed(db.pool);
  const cookie = await joinAs('author');

  const response = await me(cookie);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { role: 'author', name: 'Rosa Delgado', status: 'pending', bio: '', website: null, ages: null, contact: null, photo: null });
});

test('Given Rosa, when she saves a name, an about and a website, then her profile has them, stays waiting and her session shows the new name', async () => {
  await seed(db.pool);
  const cookie = await joinAs('author');

  const response = await save(cookie, { ...ROSA_PROFILE, name: '  Rosa D.  ' });

  assert.equal(response.status, 200);
  const profile = await response.json();
  assert.deepEqual(profile, { role: 'author', name: 'Rosa D.', status: 'pending', bio: ROSA_PROFILE.bio, website: ROSA_PROFILE.website, ages: null, contact: null, photo: null });
  assert.deepEqual(await (await me(cookie)).json(), profile);
  assert.equal((await (await fetch(`${url}/api/auth/session`, { headers: { Cookie: cookie } })).json()).name, 'Rosa D.');
});

test('Given an approved profile, when Rosa edits it, then it stays approved', async () => {
  await seed(db.pool);
  const cookie = await joinAs('author');
  await run(db.pool, "UPDATE directory_profile SET status = 'approved'");

  const response = await save(cookie, ROSA_PROFILE);

  assert.equal((await response.json()).status, 'approved');
});

test('Given an empty name or about, an about over 500 characters, or a website that is not an http(s) address of at most 200 characters, then the API answers 400 and saves nothing', async () => {
  await seed(db.pool);
  const cookie = await joinAs('author');

  for (const bad of [
    { name: ' ' },
    { bio: '  ' },
    { bio: 'x'.repeat(501) },
    { website: 'rosadelgado.example.com' },
    { website: 'javascript:alert(1)' },
    { website: `https://example.com/${'x'.repeat(190)}` },
  ]) {
    const response = await save(cookie, { ...ROSA_PROFILE, ...bad });
    assert.equal(response.status, 400, JSON.stringify(bad));
  }

  assert.equal((await (await me(cookie)).json()).bio, '');
});

test('Given Rosa, when she saves without a website, then it is cleared', async () => {
  await seed(db.pool);
  const cookie = await joinAs('author');
  await save(cookie, ROSA_PROFILE);

  const response = await save(cookie, { ...ROSA_PROFILE, website: null });

  assert.equal((await response.json()).website, null);
});

test('Given Sam, a volunteer, when he saves the ages he helps with and how to reach him, then his profile has them; without them it is refused', async () => {
  await seed(db.pool);
  const cookie = await joinAs('volunteer');
  const sam = { name: 'Sam Okafor', bio: 'Retired Year 3 teacher.', ages: 'Ages 6 to 10', contact: 'sam.okafor@example.com · weekday afternoons' };

  const response = await save(cookie, sam);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { role: 'volunteer', status: 'pending', website: null, photo: null, ...sam });
  for (const bad of [{ ages: '' }, { contact: '' }, { ages: 'x'.repeat(41) }, { contact: 'x'.repeat(121) }]) {
    assert.equal((await save(cookie, { ...sam, ...bad })).status, 400, JSON.stringify(bad));
  }
});

test('Given Rosa, when she uploads a photo, then it is served to her as a 256 × 256 WebP from her own address and her session names it; removing it clears it', async () => {
  await seed(db.pool);
  const cookie = await joinAs('author');
  const jpeg = await sharp({ create: { width: 600, height: 400, channels: 3, background: '#f4a261' } }).jpeg().toBuffer();

  const uploaded = await fetch(`${url}/api/me/photo`, { method: 'PUT', headers: { ...APP, Cookie: cookie, 'Content-Type': 'image/jpeg' }, body: new Uint8Array(jpeg) });

  assert.equal(uploaded.status, 200);
  const { photo } = (await uploaded.json()) as { photo: string };
  assert.match(photo, /^\/api\/me\/photo\?v=\w+$/);
  assert.equal((await (await me(cookie)).json()).photo, photo);
  assert.equal((await (await fetch(`${url}/api/auth/session`, { headers: { Cookie: cookie } })).json()).photo, photo);
  const served = await fetch(`${url}${photo}`, { headers: { Cookie: cookie } });
  assert.equal(served.headers.get('content-security-policy'), "default-src 'none'; sandbox");
  const image = await sharp(Buffer.from(await served.arrayBuffer())).metadata();
  assert.deepEqual([image.format, image.width, image.height], ['webp', 256, 256]);

  assert.equal((await fetch(`${url}/api/me/photo`, { method: 'DELETE', headers: { ...APP, Cookie: cookie } })).status, 204);
  assert.equal((await (await me(cookie)).json()).photo, null);
  assert.equal((await fetch(`${url}/api/me/photo`, { headers: { Cookie: cookie } })).status, 404);
});

test('Given a file that is not an image, when Rosa uploads it as her photo, then it is refused with photo-type', async () => {
  await seed(db.pool);
  const cookie = await joinAs('author');

  const response = await fetch(`${url}/api/me/photo`, { method: 'PUT', headers: { ...APP, Cookie: cookie, 'Content-Type': 'image/png' }, body: 'not an image' });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { type: 'photo-type' });
});

test('Given Dad or Nia, when they call My profile’s routes, then the API answers 403 directory-only; with no session, 401', async () => {
  await seed(db.pool);
  for (const cookie of [await signIn(SEED.parentUsername, SEED.parentPassword), await signIn(SEED.readerUsername, SEED.readerPassword)]) {
    for (const [method, path] of [['GET', '/api/me'], ['PUT', '/api/me'], ['PUT', '/api/me/photo'], ['DELETE', '/api/me/photo'], ['GET', '/api/me/photo']]) {
      const response = await fetch(`${url}${path}`, { method, headers: { ...JSON_APP, Cookie: cookie }, body: method === 'PUT' ? '{}' : undefined });
      assert.equal(response.status, 403, `${method} ${path}`);
      assert.deepEqual(await response.json(), { type: 'directory-only' });
    }
  }
  assert.equal((await fetch(`${url}/api/me`)).status, 401);
});
