// Traces to: L2-163, L2-164, L2-165, L2-166, L2-167, L2-168, L2-169
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import sharp from 'sharp';
import { createApp } from './app.ts';
import { join } from './auth.service.ts';
import { get, run } from './db.ts';
import { savePhoto } from './photos.service.ts';
import { seed, SEED } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie', 'Content-Type': 'application/json' };
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

/** An author or volunteer who joined, wrote a profile and was given a status by the operator; returns their id. */
async function directoryProfile(kind: 'author' | 'volunteer', name: string, status: 'pending' | 'approved' | 'hidden', profile: { bio: string; ages?: string; contact?: string; website?: string }) {
  const username = name.toLowerCase().replace(/\W/g, '');
  await join(db.pool, { kind, name, email: `${username}@example.com`, username, password: 'long-enough-1' });
  const { id } = (await get<{ id: string }>(db.pool, 'SELECT id FROM profile WHERE username = $1', [username]))!;
  await run(db.pool, 'UPDATE directory_profile SET status = $1, bio = $2, ages = $3, contact = $4, website = $5 WHERE profile_id = $6', [
    status,
    profile.bio,
    profile.ages ?? null,
    profile.contact ?? null,
    profile.website ?? null,
    id,
  ]);
  return id;
}

async function catalogueBook(profileId: string, id: string, title: string) {
  await run(db.pool, "INSERT INTO catalogue_book (id, profile_id, title, chapter_count, created_at) VALUES ($1, $2, $3, 12, '2026-10-19T09:00:00.000Z')", [id, profileId, title]);
}

async function signIn(username: string, password: string) {
  const response = await fetch(`${url}/api/auth/password`, { method: 'POST', headers: APP, body: JSON.stringify({ username, password, remember: true }) });
  return response.headers.get('set-cookie')!.split(';')[0]!;
}

const asDad = () => signIn(SEED.parentUsername, SEED.parentPassword);
const read = (cookie: string, path: string) => fetch(`${url}/api/directory${path}`, { headers: { Cookie: cookie } });

/** Rosa and Sam approved, Jun waiting and Helen hidden. */
async function arrange() {
  await seed(db.pool);
  const rosa = await directoryProfile('author', 'Rosa Delgado', 'approved', { bio: 'I write adventure stories.', website: 'https://rosadelgado.example.com' });
  const jun = await directoryProfile('author', 'Jun Park', 'pending', { bio: 'Funny dragon stories.' });
  const sam = await directoryProfile('volunteer', 'Sam Okafor', 'approved', { bio: 'Retired Year 3 teacher.', ages: 'Ages 6 to 10', contact: 'sam@example.com' });
  const helen = await directoryProfile('volunteer', 'Helen Marsh', 'hidden', { bio: 'Story club.', ages: 'Ages 5 to 8', contact: 'helen@example.com' });
  await catalogueBook(rosa, 'cb-fox', 'The Lighthouse Fox');
  await catalogueBook(rosa, 'cb-moon', 'Pip and the Paper Moon');
  await catalogueBook(jun, 'cb-dragon', 'Dragons of Willow Lane');
  return { rosa, jun, sam, helen };
}

test('Given approved, waiting and hidden profiles, when Dad opens the directory, then only the approved author and volunteer are listed', async () => {
  const { rosa, sam } = await arrange();
  await savePhoto(db.pool, rosa, await sharp({ create: { width: 10, height: 10, channels: 3, background: '#f4a261' } }).webp().toBuffer());

  const response = await read(await asDad(), '');

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.match(body.authors[0].photo, new RegExp(`^/api/directory/photos/${rosa}\\?v=\\w+$`));
  assert.deepEqual(body, {
    authors: [{ id: rosa, name: 'Rosa Delgado', color: 'peach', photo: body.authors[0].photo, bio: 'I write adventure stories.', bookCount: 2 }],
    volunteers: [{ id: sam, name: 'Sam Okafor', color: 'mint', photo: null, bio: 'Retired Year 3 teacher.', ages: 'Ages 6 to 10' }],
  });
});

test('Given an approved author’s photo, then Dad is served it as an image; a waiting, hidden or household person’s photo answers 404', async () => {
  const { rosa, jun, helen } = await arrange();
  const picture = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#f4a261' } }).webp().toBuffer();
  for (const id of [rosa, jun, helen, SEED.readerId]) await savePhoto(db.pool, id, picture);
  const dad = await asDad();

  const served = await read(dad, `/photos/${rosa}`);

  assert.equal(served.status, 200);
  assert.equal(served.headers.get('content-type'), 'image/webp');
  assert.equal(served.headers.get('content-security-policy'), "default-src 'none'; sandbox");
  for (const id of [jun, helen, SEED.readerId, 'p-nobody']) assert.equal((await read(dad, `/photos/${id}`)).status, 404, id);
});

test('Given Nia, then the directory and its photos answer 403 grown-ups-only; given Rosa herself, 403 household-only; with no session, 401', async () => {
  const { rosa } = await arrange();
  const nia = await signIn(SEED.readerUsername, SEED.readerPassword);
  const rosaSession = await signIn('rosadelgado', 'long-enough-1');

  for (const path of ['', `/photos/${rosa}`]) {
    const reader = await read(nia, path);
    assert.equal(reader.status, 403);
    assert.deepEqual(await reader.json(), { type: 'grown-ups-only' });
    const author = await read(rosaSession, path);
    assert.equal(author.status, 403);
    assert.deepEqual(await author.json(), { type: 'household-only' });
    assert.equal((await fetch(`${url}/api/directory${path}`)).status, 401);
  }
});

async function catalogueCover(bookId: string) {
  const image = await sharp({ create: { width: 320, height: 480, channels: 3, background: '#457b9d' } }).webp().toBuffer();
  await run(db.pool, "INSERT INTO catalogue_cover (book_id, image, etag, updated_at) VALUES ($1, $2, 'e1', '2026-10-19T09:00:00.000Z')", [bookId, image]);
}

test('Given approved Rosa, when Dad opens her profile, then her about, website and catalogue are shown, each book with its picture address', async () => {
  const { rosa } = await arrange();
  await run(db.pool, "UPDATE catalogue_book SET description = 'A fox cub keeps the lamp burning.' WHERE id = 'cb-fox'");
  await catalogueCover('cb-fox');

  const response = await read(await asDad(), `/authors/${rosa}`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    id: rosa,
    name: 'Rosa Delgado',
    color: 'peach',
    photo: null,
    bio: 'I write adventure stories.',
    website: 'https://rosadelgado.example.com',
    books: [
      { id: 'cb-fox', title: 'The Lighthouse Fox', chapterCount: 12, description: 'A fox cub keeps the lamp burning.', coverImage: '/api/directory/books/cb-fox/cover?v=e1' },
      { id: 'cb-moon', title: 'Pip and the Paper Moon', chapterCount: 12, description: '', coverImage: null },
    ],
  });
});

test('Given a waiting or hidden author, a volunteer’s id or an unknown id, when Dad opens it as an author, then the API answers 404 the same for every case', async () => {
  const { jun, sam, helen } = await arrange();
  const dad = await asDad();

  for (const id of [jun, sam, helen, SEED.parentId, 'p-nobody']) {
    const response = await read(dad, `/authors/${id}`);
    assert.equal(response.status, 404, id);
    assert.deepEqual(await response.json(), { type: 'not-found' });
  }
});

test('Given an approved author’s catalogue book, then Dad reads it with the author’s name and its picture; a waiting or hidden author’s book answers 404', async () => {
  const { rosa } = await arrange();
  await catalogueCover('cb-fox');
  const dad = await asDad();

  const book = await read(dad, '/books/cb-fox');

  assert.equal(book.status, 200);
  assert.deepEqual(await book.json(), { id: 'cb-fox', title: 'The Lighthouse Fox', author: 'Rosa Delgado', chapterCount: 12, description: '', coverImage: '/api/directory/books/cb-fox/cover?v=e1' });
  const cover = await read(dad, '/books/cb-fox/cover');
  assert.equal(cover.status, 200);
  assert.equal(cover.headers.get('content-type'), 'image/webp');
  assert.equal((await read(dad, '/books/cb-dragon')).status, 404);
  await run(db.pool, "UPDATE directory_profile SET status = 'hidden' WHERE profile_id = $1", [rosa]);
  assert.equal((await read(dad, '/books/cb-fox')).status, 404);
  assert.equal((await read(dad, '/books/cb-fox/cover')).status, 404);
  assert.equal((await read(dad, `/authors/${rosa}`)).status, 404);
});

test('Given approved Sam, when Dad opens him, then his about, the ages he helps with and his contact line are shown', async () => {
  const { sam } = await arrange();

  const response = await read(await asDad(), `/volunteers/${sam}`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: sam, name: 'Sam Okafor', color: 'mint', photo: null, bio: 'Retired Year 3 teacher.', ages: 'Ages 6 to 10', contact: 'sam@example.com' });
});

test('Given a hidden volunteer, an author’s id or an unknown id, when Dad opens it as a volunteer, then the API answers 404', async () => {
  const { rosa, helen } = await arrange();
  const dad = await asDad();

  for (const id of [helen, rosa, SEED.readerId, 'p-nobody']) {
    const response = await read(dad, `/volunteers/${id}`);
    assert.equal(response.status, 404, id);
    assert.deepEqual(await response.json(), { type: 'not-found' });
  }
});
