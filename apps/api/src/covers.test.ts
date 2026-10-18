// Traces to: L2-005, L2-006, L2-010, L2-027, L2-029, L2-041, L2-046, L2-047, L2-048
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import sharp from 'sharp';
import { createApp } from './app.ts';
import { get } from './db.ts';
import { seed, SEED } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie' };
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

async function signIn(username: string, password: string) {
  const response = await fetch(`${url}/api/auth/password`, {
    method: 'POST',
    headers: { ...APP, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, remember: true }),
  });
  assert.equal(response.status, 200);
  return response.headers.get('set-cookie')!.split(';')[0]!;
}

const signInAsDad = () => signIn(SEED.parentUsername, SEED.parentPassword);
const signInAsNia = () => signIn(SEED.readerUsername, SEED.readerPassword);

function upload(cookie: string, bookId: string, body: Buffer, type = 'image/jpeg') {
  return fetch(`${url}/api/books/${bookId}/cover`, { method: 'PUT', headers: { ...APP, Cookie: cookie, 'Content-Type': type }, body: new Uint8Array(body) });
}

function remove(cookie: string, bookId: string) {
  return fetch(`${url}/api/books/${bookId}/cover`, { method: 'DELETE', headers: { ...APP, Cookie: cookie } });
}

async function bookCover(cookie: string, bookId: string) {
  return ((await (await fetch(`${url}/api/books/${bookId}`, { headers: { Cookie: cookie } })).json()) as { coverImage: string | null }).coverImage;
}

/** A photo of a book's cover as a phone takes it: landscape, with camera and GPS EXIF. */
function phonePhoto(background = '#f4a6b8') {
  return sharp({ create: { width: 900, height: 700, channels: 3, background } })
    .withExif({ IFD0: { Make: 'Pear', Model: 'Phone 15' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '51/1 30/1 0/1' } })
    .jpeg()
    .toBuffer();
}

test('Given a book without a picture, when Dad uploads one, then the book names a picture that is served as a 320 × 480 WebP without metadata', async () => {
  await seed(db.pool);
  const cookie = await signInAsDad();
  assert.equal(await bookCover(cookie, 'b-lion'), null);

  const response = await upload(cookie, 'b-lion', await phonePhoto());

  assert.equal(response.status, 200);
  const { coverImage } = (await response.json()) as { coverImage: string };
  assert.match(coverImage, /^\/api\/books\/b-lion\/cover\?v=\w+$/);
  assert.equal(await bookCover(cookie, 'b-lion'), coverImage);
  const served = Buffer.from(await (await fetch(`${url}${coverImage}`, { headers: { Cookie: cookie } })).arrayBuffer());
  const image = await sharp(served).metadata();
  assert.deepEqual([image.format, image.width, image.height], ['webp', 320, 480]);
  assert.equal(image.exif, undefined);
  assert.equal(image.xmp, undefined);
  assert.equal(image.icc, undefined);
  assert.ok(!served.includes(Buffer.from('Pear')), 'the camera make is gone');
});

test('Given Nia adds a book, when she uploads its picture, then it is stored, but she cannot remove it', async () => {
  await seed(db.pool);
  const cookie = await signInAsNia();

  const put = await upload(cookie, 'b-winn', await phonePhoto());
  const removal = await remove(cookie, 'b-winn');

  assert.equal(put.status, 200);
  assert.deepEqual([removal.status, ((await removal.json()) as { type: string }).type], [403, 'grown-ups-only']);
  assert.ok(await bookCover(cookie, 'b-winn'));
});

test('Given a book with a picture, when Dad uploads another, then the new picture replaces it under a new version', async () => {
  await seed(db.pool);
  const cookie = await signInAsDad();
  const first = ((await (await upload(cookie, 'b-lion', await phonePhoto('#f4a6b8'))).json()) as { coverImage: string }).coverImage;

  const second = ((await (await upload(cookie, 'b-lion', await phonePhoto('#2d4a7a'))).json()) as { coverImage: string }).coverImage;

  assert.notEqual(second, first);
  assert.equal(await bookCover(cookie, 'b-lion'), second);
  const served = await fetch(`${url}${first}`, { headers: { Cookie: cookie } });
  assert.equal(`/api/books/b-lion/cover?v=${served.headers.get('etag')!.replaceAll('"', '')}`, second);
});

test('Given a book with a picture, when Dad removes it, then the book has no picture and none is served', async () => {
  await seed(db.pool);
  const cookie = await signInAsDad();
  const { coverImage } = (await (await upload(cookie, 'b-lion', await phonePhoto())).json()) as { coverImage: string };

  const response = await remove(cookie, 'b-lion');

  assert.equal(response.status, 204);
  assert.equal(await bookCover(cookie, 'b-lion'), null);
  assert.equal((await fetch(`${url}${coverImage}`, { headers: { Cookie: cookie } })).status, 404);
});

test('Given a book with a picture, then every book the API returns carries its picture next to its colour and sticker', async () => {
  await seed(db.pool);
  const dad = await signInAsDad();
  const nia = await signInAsNia();
  const { coverImage } = (await (await upload(dad, 'b-lion', await phonePhoto())).json()) as { coverImage: string };
  const { coverImage: winn } = (await (await upload(dad, 'b-winn', await phonePhoto())).json()) as { coverImage: string };
  const pages = [
    [nia, '/api/shelf'],
    [nia, '/api/books/b-lion'],
    [nia, '/api/books/b-lion/chapters/12/form'],
    [nia, '/api/chapter-logs/b-lion-c11'],
    [dad, '/api/books'],
    [dad, '/api/review'],
  ] as const;

  for (const [cookie, path] of pages) {
    const response = await fetch(`${url}${path}`, { headers: { Cookie: cookie } });
    assert.equal(response.status, 200, path);
    const covers: { id: unknown; coverImage: unknown }[] = [];
    JSON.stringify(await response.json(), (_key, value) => {
      if (value && typeof value === 'object' && 'coverColor' in value) covers.push({ id: value.id ?? value.bookId, coverImage: value.coverImage });
      return value;
    });
    assert.ok(covers.length > 0, `${path} returns a book`);
    for (const cover of covers) {
      const expected = cover.id === 'b-lion' ? coverImage : cover.id === 'b-winn' ? winn : null;
      assert.equal(cover.coverImage, expected, `${path}: ${String(cover.id)}`);
    }
  }
});

test('Given a picture is served, then it is private, sandboxed WebP with an ETag, and a matching If-None-Match is answered 304', async () => {
  await seed(db.pool);
  const cookie = await signInAsDad();
  const { coverImage } = (await (await upload(cookie, 'b-lion', await phonePhoto())).json()) as { coverImage: string };

  const served = await fetch(`${url}${coverImage}`, { headers: { Cookie: cookie } });

  assert.equal(served.headers.get('content-type'), 'image/webp');
  assert.equal(served.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(served.headers.get('content-security-policy'), "default-src 'none'; sandbox");
  assert.equal(served.headers.get('cache-control'), 'private, no-cache');
  const etag = served.headers.get('etag');
  assert.ok(etag);
  const again = await fetch(`${url}${coverImage}`, { headers: { Cookie: cookie, 'If-None-Match': etag } });
  assert.equal(again.status, 304);
  assert.equal((await again.arrayBuffer()).byteLength, 0);
});

test('Given a file that only claims to be a picture, when it is uploaded, then it is refused as photo-type and nothing is stored', async () => {
  await seed(db.pool);
  const cookie = await signInAsDad();

  const response = await upload(cookie, 'b-lion', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'));

  assert.deepEqual([response.status, ((await response.json()) as { type: string }).type], [400, 'photo-type']);
  assert.equal(await bookCover(cookie, 'b-lion'), null);
});

test('Given a body over 5 MB, when it is uploaded, then it is refused as photo-too-large', async () => {
  await seed(db.pool);
  const cookie = await signInAsDad();

  const response = await upload(cookie, 'b-lion', Buffer.alloc(5 * 1024 * 1024 + 1));

  assert.deepEqual([response.status, ((await response.json()) as { type: string }).type], [413, 'photo-too-large']);
});

test('Given an image over 40 megapixels, when it is uploaded, then it is refused as photo-type', async () => {
  await seed(db.pool);
  const cookie = await signInAsDad();
  const huge = await sharp({ create: { width: 7000, height: 6000, channels: 3, background: '#fff' } }).png().toBuffer();

  const response = await upload(cookie, 'b-lion', huge, 'image/png');

  assert.deepEqual([response.status, ((await response.json()) as { type: string }).type], [400, 'photo-type']);
});

test('Given no session, when a picture is read, uploaded or removed, then the API answers 401', async () => {
  await seed(db.pool);

  const read = await fetch(`${url}/api/books/b-lion/cover`);
  const put = await fetch(`${url}/api/books/b-lion/cover`, { method: 'PUT', headers: { ...APP, 'Content-Type': 'image/jpeg' }, body: new Uint8Array(await phonePhoto()) });
  const removal = await fetch(`${url}/api/books/b-lion/cover`, { method: 'DELETE', headers: APP });

  assert.deepEqual([read.status, put.status, removal.status], [401, 401, 401]);
});

test('Given another household’s book, when Dad reads, uploads or removes its picture, then it is not found and nothing changes', async () => {
  await seed(db.pool);
  const zedsDad = await signIn('zedsdad', 'another-pass-99');
  const { coverImage } = (await (await upload(zedsDad, 'b-other', await phonePhoto())).json()) as { coverImage: string };
  const cookie = await signInAsDad();

  const read = await fetch(`${url}${coverImage}`, { headers: { Cookie: cookie } });
  const put = await upload(cookie, 'b-other', await phonePhoto('#000000'));
  const removal = await remove(cookie, 'b-other');

  assert.deepEqual([read.status, put.status, removal.status], [404, 404, 404]);
  assert.notEqual(read.headers.get('content-type'), 'image/webp');
  assert.equal(await bookCover(zedsDad, 'b-other'), coverImage);
});

test('Given an upload or removal that did not come from the app, then it is refused and the picture is unchanged', async () => {
  await seed(db.pool);
  const cookie = await signInAsDad();
  const { coverImage } = (await (await upload(cookie, 'b-lion', await phonePhoto())).json()) as { coverImage: string };

  const put = await fetch(`${url}/api/books/b-lion/cover`, { method: 'PUT', headers: { Cookie: cookie, 'Content-Type': 'image/jpeg' }, body: new Uint8Array(await phonePhoto('#000000')) });
  const removal = await fetch(`${url}/api/books/b-lion/cover`, { method: 'DELETE', headers: { ...APP, Cookie: cookie, Origin: 'https://evil.example' } });

  assert.deepEqual([put.status, removal.status], [403, 403]);
  assert.equal(await bookCover(cookie, 'b-lion'), coverImage);
});

test('Given a book with a picture, when Dad removes the book, then its picture goes with it', async () => {
  await seed(db.pool);
  const cookie = await signInAsDad();
  await upload(cookie, 'b-lion', await phonePhoto());

  const response = await fetch(`${url}/api/books/b-lion`, { method: 'DELETE', headers: { ...APP, Cookie: cookie } });

  assert.equal(response.status, 204);
  assert.equal((await get<{ n: number }>(db.pool, "SELECT COUNT(*) AS n FROM book_cover WHERE book_id = 'b-lion'"))!.n, 0);
});

test('Given a picture is uploaded, then no log line carries the image', async () => {
  await seed(db.pool);
  const lines: Record<string, unknown>[] = [];
  const logged = createApp(db.pool, { log: (line) => lines.push(line) }).listen(0);
  try {
    const at = `http://localhost:${(logged.address() as { port: number }).port}`;
    const cookie = await signInAsDad();
    const jpeg = await phonePhoto();

    const response = await fetch(`${at}/api/books/b-lion/cover`, { method: 'PUT', headers: { ...APP, Cookie: cookie, 'Content-Type': 'image/jpeg' }, body: new Uint8Array(jpeg) });
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.equal(response.status, 200);
    const text = JSON.stringify(lines);
    assert.ok(lines.length > 0);
    assert.ok(text.length < 1000, 'a log line is a summary, not a body');
    assert.ok(!text.includes('Pear') && !text.includes(jpeg.subarray(0, 64).toString('base64')));
  } finally {
    logged.close();
  }
});
