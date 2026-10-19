// Traces to: L2-083, L2-109, L2-110, L2-108, L2-109
import { after, before, beforeEach, test } from 'node:test';
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
const logged: string[] = [];

before(async () => {
  db = await createTestDatabase();
  server = createApp(db.pool, { log: (line) => logged.push(JSON.stringify(line)) }).listen(0);
  url = `http://localhost:${(server.address() as { port: number }).port}`;
});

after(async () => {
  server.close();
  await db.drop();
});

beforeEach(() => seed(db.pool));

async function signIn(username: string, password: string) {
  const response = await fetch(`${url}/api/auth/password`, {
    method: 'POST',
    headers: { ...APP, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, remember: true }),
  });
  assert.equal(response.status, 200);
  return response.headers.get('set-cookie')!.split(';')[0]!;
}

const dad = () => signIn(SEED.parentUsername, SEED.parentPassword);
const nia = () => signIn(SEED.readerUsername, SEED.readerPassword);
const zedsDad = () => signIn('zedsdad', 'another-pass-99');

interface Reward {
  id: string;
  name: string;
  pictures: { id: string; url: string }[];
  featuredPicture: string | null;
}

async function addReward(cookie: string, name = 'Trip to the zoo') {
  const response = await fetch(`${url}/api/gallery-rewards`, {
    method: 'POST',
    headers: { ...APP, Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, target: 3 }),
  });
  assert.equal(response.status, 201);
  return (await response.json()) as Reward;
}

function upload(cookie: string | null, rewardId: string, body: Buffer, type = 'image/jpeg') {
  return fetch(`${url}/api/gallery-rewards/${rewardId}/pictures`, {
    method: 'POST',
    headers: { ...APP, ...(cookie ? { Cookie: cookie } : {}), 'Content-Type': type },
    body: new Uint8Array(body),
  });
}

async function uploaded(cookie: string, rewardId: string, background?: string) {
  const response = await upload(cookie, rewardId, await phonePhoto(background));
  assert.equal(response.status, 201);
  return (await response.json()) as Reward;
}

function change(cookie: string | null, method: 'DELETE' | 'POST', path: string) {
  return fetch(`${url}/api/gallery-rewards${path}`, { method, headers: { ...APP, ...(cookie ? { Cookie: cookie } : {}) } });
}

async function rewardIn(cookie: string, id: string) {
  const { rewards } = (await (await fetch(`${url}/api/gallery-rewards`, { headers: { Cookie: cookie } })).json()) as { rewards: Reward[] };
  return rewards.find((r) => r.id === id);
}

/** A photo as a phone takes it: landscape, with camera and GPS EXIF. */
function phonePhoto(background = '#8ec9f0') {
  return sharp({ create: { width: 900, height: 700, channels: 3, background } })
    .withExif({ IFD0: { Make: 'Pear', Model: 'Phone 15' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '51/1 30/1 0/1' } })
    .jpeg()
    .toBuffer();
}

const typeOf = async (response: Response) => [response.status, ((await response.json()) as { type: string }).type];

test('Given a reward without pictures, when Dad uploads one, then it is featured and served as a 480 × 480 WebP without metadata', async () => {
  const cookie = await dad();
  const reward = await addReward(cookie);

  const response = await upload(cookie, reward.id, await phonePhoto());

  assert.equal(response.status, 201);
  const answered = (await response.json()) as Reward;
  assert.equal(answered.pictures.length, 1);
  const [picture] = answered.pictures;
  assert.match(picture!.url, new RegExp(`^/api/gallery-rewards/${reward.id}/pictures/${picture!.id}\\?v=\\w+$`));
  assert.equal(answered.featuredPicture, picture!.url);
  assert.deepEqual(await rewardIn(await nia(), reward.id), answered);
  const served = Buffer.from(await (await fetch(`${url}${picture!.url}`, { headers: { Cookie: await nia() } })).arrayBuffer());
  const image = await sharp(served).metadata();
  assert.deepEqual([image.format, image.width, image.height], ['webp', 480, 480]);
  assert.equal(image.exif, undefined);
  assert.equal(image.xmp, undefined);
  assert.equal(image.icc, undefined);
  assert.ok(!served.includes(Buffer.from('Pear')), 'the camera make is gone');
});

test('Given a picture is served, then it is private, sandboxed WebP with an ETag, and a matching If-None-Match is answered 304', async () => {
  const cookie = await dad();
  const { featuredPicture } = await uploaded(cookie, (await addReward(cookie)).id);

  const served = await fetch(`${url}${featuredPicture}`, { headers: { Cookie: cookie } });

  assert.equal(served.headers.get('content-type'), 'image/webp');
  assert.equal(served.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(served.headers.get('content-security-policy'), "default-src 'none'; sandbox");
  assert.equal(served.headers.get('cache-control'), 'private, no-cache');
  const etag = served.headers.get('etag');
  assert.ok(etag);
  const again = await fetch(`${url}${featuredPicture}`, { headers: { Cookie: cookie, 'If-None-Match': etag } });
  assert.equal(again.status, 304);
  assert.equal((await again.arrayBuffer()).byteLength, 0);
});

test('Given a file that only claims to be a picture, a GIF, an empty body or an image over 40 megapixels, then each is refused as photo-type and nothing is stored', async () => {
  const cookie = await dad();
  const reward = await addReward(cookie);
  const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } }).gif().toBuffer();
  const huge = await sharp({ create: { width: 7000, height: 6000, channels: 3, background: '#fff' } }).png().toBuffer();
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

  for (const [body, type] of [[svg, 'image/jpeg'], [gif, 'image/gif'], [Buffer.alloc(0), 'image/png'], [huge, 'image/png']] as const) {
    assert.deepEqual(await typeOf(await upload(cookie, reward.id, body, type)), [400, 'photo-type'], type);
  }
  assert.deepEqual((await rewardIn(cookie, reward.id))?.pictures, []);
});

test('Given a body over 5 MB, when it is uploaded, then it is refused as photo-too-large', async () => {
  const cookie = await dad();
  const reward = await addReward(cookie);

  assert.deepEqual(await typeOf(await upload(cookie, reward.id, Buffer.alloc(5 * 1024 * 1024 + 1))), [413, 'photo-too-large']);
});

test('Given Nia, when she uploads a reward picture, then the API answers 403 and nothing is stored', async () => {
  const reward = await addReward(await dad());

  assert.deepEqual(await typeOf(await upload(await nia(), reward.id, await phonePhoto())), [403, 'grown-ups-only']);
  assert.deepEqual((await rewardIn(await nia(), reward.id))?.pictures, []);
});

test('Given no session, when a reward picture is read or uploaded, then the API answers 401', async () => {
  const cookie = await dad();
  const reward = await uploaded(cookie, (await addReward(cookie)).id);

  const read = await fetch(`${url}${reward.featuredPicture}`);
  const post = await upload(null, reward.id, await phonePhoto());

  assert.deepEqual([read.status, post.status], [401, 401]);
});

test('Given another household’s reward, when Dad reads or uploads its picture, then it is not found and nothing changes', async () => {
  const theirs = await uploaded(await zedsDad(), (await addReward(await zedsDad(), 'Kite')).id);
  const cookie = await dad();

  const read = await fetch(`${url}${theirs.featuredPicture}`, { headers: { Cookie: cookie } });
  const post = await upload(cookie, theirs.id, await phonePhoto('#000000'));
  const unknown = await upload(cookie, 'no-such-reward', await phonePhoto());

  assert.deepEqual([read.status, post.status, unknown.status], [404, 404, 404]);
  assert.notEqual(read.headers.get('content-type'), 'image/webp');
  assert.deepEqual(await rewardIn(await zedsDad(), theirs.id), theirs);
});

test('Given an upload that did not come from the app, then it is refused and nothing is stored', async () => {
  const cookie = await dad();
  const reward = await addReward(cookie);

  const post = await fetch(`${url}/api/gallery-rewards/${reward.id}/pictures`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'image/jpeg' }, body: new Uint8Array(await phonePhoto()) });

  assert.equal(post.status, 403);
  assert.deepEqual((await rewardIn(cookie, reward.id))?.pictures, []);
});

test('Given a reward with a picture, when Dad removes the reward, then its picture goes with it', async () => {
  const cookie = await dad();
  const reward = await uploaded(cookie, (await addReward(cookie)).id);

  assert.equal((await change(cookie, 'DELETE', `/${reward.id}`)).status, 204);

  assert.equal((await get<{ n: number }>(db.pool, 'SELECT COUNT(*) AS n FROM reward_picture WHERE reward_id = $1', [reward.id]))!.n, 0);
  assert.equal((await fetch(`${url}${reward.featuredPicture}`, { headers: { Cookie: cookie } })).status, 404);
});

test('Given a reward picture is uploaded, then no log line carries the image or the reward', async () => {
  const cookie = await dad();
  const reward = await addReward(cookie, 'Secret sleepover');
  const jpeg = await phonePhoto();
  logged.length = 0;

  const response = await upload(cookie, reward.id, jpeg);
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(response.status, 201);
  const text = logged.join('\n');
  assert.ok(logged.length > 0);
  assert.ok(text.length < 1000, 'a log line is a summary, not a body');
  assert.ok(!text.includes('Pear') && !text.includes('Secret sleepover') && !text.includes(jpeg.subarray(0, 64).toString('base64')));
});

test('Given a reward with a picture, when Dad adds more, then they follow it in order and the first stays featured', async () => {
  const cookie = await dad();
  const reward = await addReward(cookie);
  const first = await uploaded(cookie, reward.id, '#8ec9f0');

  await uploaded(cookie, reward.id, '#fbd9a0');
  const third = await uploaded(cookie, reward.id, '#f7c6d4');

  assert.equal(third.pictures.length, 3);
  assert.equal(third.pictures[0]!.id, first.pictures[0]!.id);
  assert.equal(third.featuredPicture, first.featuredPicture);
});

test('Given a reward with 6 pictures, when a seventh is uploaded, then the API answers 409 and stores nothing', async () => {
  const cookie = await dad();
  const reward = await addReward(cookie);
  for (let i = 0; i < 6; i++) await uploaded(cookie, reward.id);

  assert.deepEqual(await typeOf(await upload(cookie, reward.id, await phonePhoto())), [409, 'too-many-pictures']);
  assert.equal((await rewardIn(cookie, reward.id))?.pictures.length, 6);
});

test('Given six uploads at the same time, then the reward holds at most 6 pictures and exactly one is featured', async () => {
  const cookie = await dad();
  const reward = await addReward(cookie);
  await uploaded(cookie, reward.id);
  const jpeg = await phonePhoto();

  const statuses = (await Promise.all(Array.from({ length: 6 }, () => upload(cookie, reward.id, jpeg)))).map((r) => r.status).sort();

  assert.deepEqual(statuses, [201, 201, 201, 201, 201, 409]);
  assert.equal((await rewardIn(cookie, reward.id))?.pictures.length, 6);
  assert.equal((await get<{ n: number }>(db.pool, 'SELECT COUNT(*)::int AS n FROM reward_picture WHERE reward_id = $1 AND featured', [reward.id]))!.n, 1);
});

test('Given a reward with pictures, when Dad removes one that is not featured, then it goes, is no longer served and the featured one stays', async () => {
  const cookie = await dad();
  const reward = await addReward(cookie);
  await uploaded(cookie, reward.id);
  const both = await uploaded(cookie, reward.id);
  const second = both.pictures[1]!;

  const response = await change(cookie, 'DELETE', `/${reward.id}/pictures/${second.id}`);

  assert.equal(response.status, 200);
  const answered = (await response.json()) as Reward;
  assert.deepEqual(answered.pictures, [both.pictures[0]]);
  assert.equal(answered.featuredPicture, both.featuredPicture);
  assert.equal((await fetch(`${url}${second.url}`, { headers: { Cookie: cookie } })).status, 404);
});

test('Given a reward with three pictures, when Dad removes the featured one, then the oldest one left is featured; removing the last leaves none', async () => {
  const cookie = await dad();
  const reward = await addReward(cookie);
  await uploaded(cookie, reward.id);
  await uploaded(cookie, reward.id);
  const { pictures } = await uploaded(cookie, reward.id);

  const afterFirst = (await (await change(cookie, 'DELETE', `/${reward.id}/pictures/${pictures[0]!.id}`)).json()) as Reward;
  assert.equal(afterFirst.featuredPicture, pictures[1]!.url);

  await change(cookie, 'DELETE', `/${reward.id}/pictures/${pictures[1]!.id}`);
  const last = (await (await change(cookie, 'DELETE', `/${reward.id}/pictures/${pictures[2]!.id}`)).json()) as Reward;
  assert.deepEqual([last.pictures, last.featuredPicture], [[], null]);
  assert.equal((await rewardIn(await nia(), reward.id))?.featuredPicture, null);
});

test('Given Nia, or another household, or an unknown picture, when a picture is removed, then the API answers 403 or 404 and nothing changes', async () => {
  const cookie = await dad();
  const reward = await uploaded(cookie, (await addReward(cookie)).id);
  const picture = reward.pictures[0]!.id;

  assert.deepEqual(await typeOf(await change(await nia(), 'DELETE', `/${reward.id}/pictures/${picture}`)), [403, 'grown-ups-only']);
  assert.equal((await change(await zedsDad(), 'DELETE', `/${reward.id}/pictures/${picture}`)).status, 404);
  assert.equal((await change(cookie, 'DELETE', `/${reward.id}/pictures/no-such-picture`)).status, 404);
  assert.equal((await change(null, 'DELETE', `/${reward.id}/pictures/${picture}`)).status, 401);
  assert.deepEqual(await rewardIn(cookie, reward.id), reward);
});

test('Given a reward with three pictures, when Dad makes the third featured, then it alone is featured, and Nia sees it', async () => {
  const cookie = await dad();
  const reward = await addReward(cookie);
  await uploaded(cookie, reward.id);
  await uploaded(cookie, reward.id);
  const { pictures } = await uploaded(cookie, reward.id);

  const response = await change(cookie, 'POST', `/${reward.id}/pictures/${pictures[2]!.id}/feature`);

  assert.equal(response.status, 200);
  const answered = (await response.json()) as Reward;
  assert.deepEqual([answered.pictures, answered.featuredPicture], [pictures, pictures[2]!.url]);
  assert.equal((await rewardIn(await nia(), reward.id))?.featuredPicture, pictures[2]!.url);
  assert.equal((await get<{ n: number }>(db.pool, 'SELECT COUNT(*)::int AS n FROM reward_picture WHERE reward_id = $1 AND featured', [reward.id]))!.n, 1);
});

test('Given feature changes and removals at the same time, then the reward always has exactly one featured picture', async () => {
  const cookie = await dad();
  const reward = await addReward(cookie);
  for (let i = 0; i < 5; i++) await uploaded(cookie, reward.id);
  const { pictures } = (await rewardIn(cookie, reward.id))!;

  await Promise.all([
    ...pictures.slice(1).map((p) => change(cookie, 'POST', `/${reward.id}/pictures/${p.id}/feature`)),
    change(cookie, 'DELETE', `/${reward.id}/pictures/${pictures[0]!.id}`),
    change(cookie, 'DELETE', `/${reward.id}/pictures/${pictures[4]!.id}`),
  ]);

  const featured = await get<{ n: number }>(db.pool, 'SELECT COUNT(*)::int AS n FROM reward_picture WHERE reward_id = $1 AND featured', [reward.id]);
  assert.equal(featured!.n, 1);
  assert.equal((await rewardIn(cookie, reward.id))?.pictures.length, 3);
});

test('Given Nia, or another household, or an unknown picture, when a picture is made featured, then the API answers 403 or 404 and nothing changes', async () => {
  const cookie = await dad();
  const { id } = await addReward(cookie);
  await uploaded(cookie, id);
  const reward = await uploaded(cookie, id);
  const second = reward.pictures[1]!.id;

  assert.deepEqual(await typeOf(await change(await nia(), 'POST', `/${reward.id}/pictures/${second}/feature`)), [403, 'grown-ups-only']);
  assert.equal((await change(await zedsDad(), 'POST', `/${reward.id}/pictures/${second}/feature`)).status, 404);
  assert.equal((await change(cookie, 'POST', `/${reward.id}/pictures/no-such-picture/feature`)).status, 404);
  assert.equal((await change(null, 'POST', `/${reward.id}/pictures/${second}/feature`)).status, 401);
  assert.deepEqual(await rewardIn(cookie, reward.id), reward);
});
