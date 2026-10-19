// Traces to: L2-149, L2-150, L2-151, L2-160
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import sharp from 'sharp';
import { createApp } from './app.ts';
import { seed, SEED } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie' };
const JSON_APP = { ...APP, 'Content-Type': 'application/json' };
const FOX = { title: 'The Lighthouse Fox', chapterCount: 12, description: 'A fox cub keeps the lighthouse lamp burning.' };
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

async function joinAs(kind: 'author' | 'volunteer', username: string) {
  const response = await fetch(`${url}/api/auth/join`, {
    method: 'POST',
    headers: JSON_APP,
    body: JSON.stringify({ kind, name: username, email: `${username}@example.com`, username, password: 'long-enough-1' }),
  });
  return response.headers.get('set-cookie')!.split(';')[0]!;
}

const send = (cookie: string, method: string, path: string, body?: object) =>
  fetch(`${url}/api/catalogue-books${path}`, { method, headers: { ...JSON_APP, Cookie: cookie }, body: body ? JSON.stringify(body) : undefined });
const list = async (cookie: string) => (await send(cookie, 'GET', '')).json();
const cover = () => sharp({ create: { width: 900, height: 900, channels: 3, background: '#457b9d' } }).jpeg().toBuffer();
const putCover = async (cookie: string, id: string, body: Buffer | string) =>
  fetch(`${url}/api/catalogue-books/${id}/cover`, { method: 'PUT', headers: { ...APP, Cookie: cookie, 'Content-Type': 'image/jpeg' }, body: typeof body === 'string' ? body : new Uint8Array(body) });

test('Given Rosa, when she adds two books, then her catalogue lists them oldest first with trimmed text and no pictures', async () => {
  await seed(db.pool);
  const rosa = await joinAs('author', 'rosa');

  const added = await send(rosa, 'POST', '', { ...FOX, title: '  The Lighthouse Fox ' });
  await send(rosa, 'POST', '', { title: 'Pip and the Paper Moon', chapterCount: 9 });

  assert.equal(added.status, 201);
  const fox = await added.json();
  assert.deepEqual(fox, { id: fox.id, ...FOX, coverImage: null });
  assert.deepEqual(
    (await list(rosa)).map((b: { title: string; chapterCount: number; description: string }) => [b.title, b.chapterCount, b.description]),
    [
      ['The Lighthouse Fox', 12, FOX.description],
      ['Pip and the Paper Moon', 9, ''],
    ],
  );
});

test('Given an empty or over-long title, a chapter count that is not a whole number from 1 to 200, or a description over 300 characters, then the API answers 400 and adds nothing', async () => {
  await seed(db.pool);
  const rosa = await joinAs('author', 'rosa');

  for (const bad of [{ title: ' ' }, { title: 'x'.repeat(121) }, { chapterCount: 0 }, { chapterCount: 201 }, { chapterCount: 2.5 }, { description: 'x'.repeat(301) }]) {
    assert.equal((await send(rosa, 'POST', '', { ...FOX, ...bad })).status, 400, JSON.stringify(bad));
  }

  assert.deepEqual(await list(rosa), []);
});

test('Given a book in Rosa’s catalogue, when she edits it and then removes it, then the catalogue shows each change', async () => {
  await seed(db.pool);
  const rosa = await joinAs('author', 'rosa');
  const { id } = await (await send(rosa, 'POST', '', FOX)).json();

  const edited = await send(rosa, 'PATCH', `/${id}`, { ...FOX, chapterCount: 14, description: '' });

  assert.equal(edited.status, 200);
  assert.deepEqual(await edited.json(), { id, title: FOX.title, chapterCount: 14, description: '', coverImage: null });
  assert.equal((await send(rosa, 'DELETE', `/${id}`)).status, 204);
  assert.deepEqual(await list(rosa), []);
});

test('Given a cover picture, when Rosa uploads it, then it is served to her as a 320 × 480 WebP; removing it takes it away', async () => {
  await seed(db.pool);
  const rosa = await joinAs('author', 'rosa');
  const { id } = await (await send(rosa, 'POST', '', FOX)).json();

  const uploaded = await putCover(rosa, id, await cover());

  assert.equal(uploaded.status, 200);
  const { coverImage } = (await uploaded.json()) as { coverImage: string };
  assert.match(coverImage, new RegExp(`^/api/catalogue-books/${id}/cover\\?v=\\w+$`));
  assert.equal((await list(rosa))[0].coverImage, coverImage);
  const served = await fetch(`${url}${coverImage}`, { headers: { Cookie: rosa } });
  assert.equal(served.headers.get('content-security-policy'), "default-src 'none'; sandbox");
  const image = await sharp(Buffer.from(await served.arrayBuffer())).metadata();
  assert.deepEqual([image.format, image.width, image.height], ['webp', 320, 480]);

  assert.equal((await send(rosa, 'DELETE', `/${id}/cover`)).status, 204);
  assert.equal((await list(rosa))[0].coverImage, null);
  assert.equal((await fetch(`${url}/api/catalogue-books/${id}/cover`, { headers: { Cookie: rosa } })).status, 404);
});

test('Given a file that is not a picture, when Rosa uploads it as a cover, then it is refused with photo-type', async () => {
  await seed(db.pool);
  const rosa = await joinAs('author', 'rosa');
  const { id } = await (await send(rosa, 'POST', '', FOX)).json();

  const response = await putCover(rosa, id, 'not a picture');

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { type: 'photo-type' });
});

test('Given Jun, another author, when he reads, edits, removes or pictures Rosa’s book, then each answers 404 and nothing changes', async () => {
  await seed(db.pool);
  const rosa = await joinAs('author', 'rosa');
  const jun = await joinAs('author', 'jun');
  const { id } = await (await send(rosa, 'POST', '', FOX)).json();

  assert.equal((await send(jun, 'PATCH', `/${id}`, { ...FOX, title: 'Mine now' })).status, 404);
  assert.equal((await send(jun, 'DELETE', `/${id}`)).status, 404);
  assert.equal((await putCover(jun, id, await cover())).status, 404);
  assert.equal((await send(jun, 'DELETE', `/${id}/cover`)).status, 404);
  assert.equal((await fetch(`${url}/api/catalogue-books/${id}/cover`, { headers: { Cookie: jun } })).status, 404);
  assert.deepEqual(await list(jun), []);
  assert.deepEqual((await list(rosa)).map((b: { title: string }) => b.title), [FOX.title]);
});

test('Given Sam, a volunteer, then every catalogue route answers 403 authors-only; given Dad, 403 directory-only', async () => {
  await seed(db.pool);
  const sam = await joinAs('volunteer', 'sam');
  const signedIn = await fetch(`${url}/api/auth/password`, { method: 'POST', headers: JSON_APP, body: JSON.stringify({ username: SEED.parentUsername, password: SEED.parentPassword, remember: true }) });
  const dad = signedIn.headers.get('set-cookie')!.split(';')[0]!;

  for (const [cookie, type] of [
    [sam, 'authors-only'],
    [dad, 'directory-only'],
  ]) {
    for (const [method, path] of [['GET', ''], ['POST', ''], ['PATCH', '/b1'], ['DELETE', '/b1'], ['PUT', '/b1/cover'], ['DELETE', '/b1/cover'], ['GET', '/b1/cover']]) {
      const response = await send(cookie!, method!, path!, method === 'GET' || method === 'DELETE' ? undefined : FOX);
      assert.equal(response.status, 403, `${type} ${method} ${path}`);
      assert.deepEqual(await response.json(), { type });
    }
  }
});
