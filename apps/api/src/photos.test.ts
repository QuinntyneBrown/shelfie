// Traces to: L2-005, L2-006, L2-027, L2-029, L2-042, L2-044, L2-045
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import sharp from 'sharp';
import { createApp } from './app.ts';
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

function upload(cookie: string, body: Buffer, type = 'image/jpeg') {
  return fetch(`${url}/api/profile/photo`, { method: 'PUT', headers: { ...APP, Cookie: cookie, 'Content-Type': type }, body: new Uint8Array(body) });
}

async function sessionPhoto(cookie: string) {
  return ((await (await fetch(`${url}/api/auth/session`, { headers: { Cookie: cookie } })).json()) as { photo: string | null }).photo;
}

/** A photo as a phone takes it: landscape, with camera and GPS EXIF. */
function phonePhoto() {
  return sharp({ create: { width: 800, height: 600, channels: 3, background: '#f4a6b8' } })
    .withExif({ IFD0: { Make: 'Pear', Model: 'Phone 15' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '51/1 30/1 0/1' } })
    .jpeg()
    .toBuffer();
}

test('Given Dad without a photo, when he uploads a JPEG, then his session names a photo that is served as a 256 × 256 WebP', async () => {
  await seed(db.pool);
  const cookie = await signInAsDad();
  assert.equal(await sessionPhoto(cookie), null);

  const response = await upload(cookie, await phonePhoto());

  assert.equal(response.status, 200);
  const { photo } = (await response.json()) as { photo: string };
  assert.match(photo, new RegExp(`^/api/photos/${SEED.parentId}\\?v=\\w+$`));
  assert.equal(await sessionPhoto(cookie), photo);
  const served = await fetch(`${url}${photo}`, { headers: { Cookie: cookie } });
  assert.equal(served.status, 200);
  const image = await sharp(Buffer.from(await served.arrayBuffer())).metadata();
  assert.deepEqual([image.format, image.width, image.height], ['webp', 256, 256]);
});

test('Given a photo carrying camera and GPS data, when it is uploaded, then the served photo carries no EXIF, XMP or ICC data', async () => {
  await seed(db.pool);
  const cookie = await signInAsDad();

  const { photo } = (await (await upload(cookie, await phonePhoto())).json()) as { photo: string };

  const served = Buffer.from(await (await fetch(`${url}${photo}`, { headers: { Cookie: cookie } })).arrayBuffer());
  const image = await sharp(served).metadata();
  assert.equal(image.exif, undefined);
  assert.equal(image.xmp, undefined);
  assert.equal(image.icc, undefined);
  assert.ok(!served.includes(Buffer.from('Pear')), 'the camera make is gone');
});

test('Given a photo is served, then it is private, sandboxed WebP with an ETag, and a matching If-None-Match is answered 304', async () => {
  await seed(db.pool);
  const cookie = await signInAsDad();
  const { photo } = (await (await upload(cookie, await phonePhoto())).json()) as { photo: string };

  const served = await fetch(`${url}${photo}`, { headers: { Cookie: cookie } });

  assert.equal(served.headers.get('content-type'), 'image/webp');
  assert.equal(served.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(served.headers.get('content-security-policy'), "default-src 'none'; sandbox");
  assert.equal(served.headers.get('cache-control'), 'private, no-cache');
  const etag = served.headers.get('etag');
  assert.ok(etag);
  const again = await fetch(`${url}${photo}`, { headers: { Cookie: cookie, 'If-None-Match': etag } });
  assert.equal(again.status, 304);
  assert.equal((await again.arrayBuffer()).byteLength, 0);
});

test('Given a file that only claims to be a photo, when it is uploaded, then it is refused as photo-type and nothing is stored', async () => {
  await seed(db.pool);
  const cookie = await signInAsDad();

  const response = await upload(cookie, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'image/jpeg');

  assert.deepEqual([response.status, ((await response.json()) as { type: string }).type], [400, 'photo-type']);
  assert.equal(await sessionPhoto(cookie), null);
});

test('Given a GIF, when it is uploaded, then it is refused as photo-type', async () => {
  await seed(db.pool);
  const cookie = await signInAsDad();
  const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } }).gif().toBuffer();

  const response = await upload(cookie, gif, 'image/gif');

  assert.deepEqual([response.status, ((await response.json()) as { type: string }).type], [400, 'photo-type']);
});

test('Given a body over 5 MB, when it is uploaded, then it is refused as photo-too-large', async () => {
  await seed(db.pool);
  const cookie = await signInAsDad();

  const response = await upload(cookie, Buffer.alloc(5 * 1024 * 1024 + 1));

  assert.deepEqual([response.status, ((await response.json()) as { type: string }).type], [413, 'photo-too-large']);
});

test('Given an image over 40 megapixels, when it is uploaded, then it is refused as photo-type', async () => {
  await seed(db.pool);
  const cookie = await signInAsDad();
  const huge = await sharp({ create: { width: 7000, height: 6000, channels: 3, background: '#fff' } }).png().toBuffer();

  const response = await upload(cookie, huge, 'image/png');

  assert.deepEqual([response.status, ((await response.json()) as { type: string }).type], [400, 'photo-type']);
});

test('Given no session, when a photo is read, uploaded or removed, then the API answers 401', async () => {
  await seed(db.pool);
  const jpeg = await phonePhoto();

  const read = await fetch(`${url}/api/photos/${SEED.parentId}`);
  const put = await fetch(`${url}/api/profile/photo`, { method: 'PUT', headers: { ...APP, 'Content-Type': 'image/jpeg' }, body: new Uint8Array(jpeg) });
  const remove = await fetch(`${url}/api/profile/photo`, { method: 'DELETE', headers: APP });

  assert.deepEqual([read.status, put.status, remove.status], [401, 401, 401]);
});

test('Given another household’s photo, when Dad asks for it, then it is not found and no image comes back', async () => {
  await seed(db.pool);
  const zedsDad = await signIn('zedsdad', 'another-pass-99');
  await upload(zedsDad, await phonePhoto());
  const cookie = await signInAsDad();

  const response = await fetch(`${url}/api/photos/p-other-dad`, { headers: { Cookie: cookie } });

  assert.equal(response.status, 404);
  assert.notEqual(response.headers.get('content-type'), 'image/webp');
});

test('Given an upload or removal that did not come from the app, then it is refused and the photo is unchanged', async () => {
  await seed(db.pool);
  const cookie = await signInAsDad();
  const { photo } = (await (await upload(cookie, await phonePhoto())).json()) as { photo: string };

  const put = await fetch(`${url}/api/profile/photo`, { method: 'PUT', headers: { Cookie: cookie, 'Content-Type': 'image/jpeg' }, body: new Uint8Array(await phonePhoto()) });
  const remove = await fetch(`${url}/api/profile/photo`, { method: 'DELETE', headers: { ...APP, Cookie: cookie, Origin: 'https://evil.example' } });

  assert.deepEqual([put.status, remove.status], [403, 403]);
  assert.equal(await sessionPhoto(cookie), photo);
});

test('Given a photo is uploaded, then no log line carries the image', async () => {
  await seed(db.pool);
  const lines: Record<string, unknown>[] = [];
  const logged = createApp(db.pool, { log: (line) => lines.push(line) }).listen(0);
  try {
    const at = `http://localhost:${(logged.address() as { port: number }).port}`;
    const cookie = await signInAsDad();
    const jpeg = await phonePhoto();

    const response = await fetch(`${at}/api/profile/photo`, { method: 'PUT', headers: { ...APP, Cookie: cookie, 'Content-Type': 'image/jpeg' }, body: new Uint8Array(jpeg) });
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
