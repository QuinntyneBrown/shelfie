// Traces to: L2-137, L2-138, L2-139, L2-140, L2-141, L2-142, L2-146
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { copyFileSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { get, migrate } from './db.ts';
import { hashSecret } from './secret.ts';
import { seed, SEED } from './seed.ts';
import { todayIn } from './streak.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie' };
const THEO_PASSWORD = hashSecret('theo-reads-6');
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

// Nia's household gains her brother Theo, and none of the seeded logs fall inside a challenge started today.
beforeEach(async () => {
  await seed(db.pool);
  await db.pool.query(
    "INSERT INTO profile (id, household_id, role, name, color, username, email, password_hash) VALUES ('p-theo', $1, 'reader', 'Theo', 'mint', 'theo', NULL, $2)",
    [SEED.householdId, THEO_PASSWORD],
  );
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

const dad = () => signIn(SEED.parentUsername, SEED.parentPassword);
const nia = () => signIn(SEED.readerUsername, SEED.readerPassword);
const zedsDad = () => signIn('zedsdad', 'another-pass-99');

function call(cookie: string | null, method: string, path: string, body?: unknown) {
  return fetch(`${url}/api${path}`, {
    method,
    headers: { ...APP, ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

interface Standing {
  readerId: string;
  name: string;
  count: number;
  rank: number;
  leading: boolean;
}
interface Challenge {
  id: string;
  name: string;
  measure: string;
  goal: number;
  startsOn: string;
  endsOn: string;
  daysLeft: number;
  ended: boolean;
  standings: Standing[];
  winners: string[];
  reward: { text: string; note: string | null } | null;
  insights: {
    topReader: { name: string; count: number } | null;
    climber: { name: string; gain: number } | null;
    streak: { name: string; days: number } | null;
  } | null;
}
interface View {
  today: string;
  readers: { id: string; name: string }[];
  current: Challenge | null;
  past: Challenge[];
}

const TODAY = () => todayIn('UTC', new Date());
const day = (offset: number) => {
  const date = new Date(`${TODAY()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

const RACE = { name: 'Half-term reading race', measure: 'chapters', goal: 15, length: 'two-weeks', readerIds: ['p-nia', 'p-theo'] };

async function start(cookie: string, body: object = RACE): Promise<Challenge> {
  const response = await call(cookie, 'POST', '/challenges', body);
  assert.equal(response.status, 201, await response.clone().text());
  return (await response.json()) as Challenge;
}

async function view(cookie: string): Promise<View> {
  const response = await call(cookie, 'GET', '/challenges');
  assert.equal(response.status, 200);
  return (await response.json()) as View;
}

let nextChapter = 100;
/** Stores a chapter of The Wild Robot as logged by a reader at a moment. */
async function logged(readerId: string | null, at: string, readOn = at.slice(0, 10)) {
  const n = nextChapter++;
  await db.pool.query(
    'INSERT INTO chapter_log (id, book_id, chapter_number, read_on, logged_at, undo_until, reader_id) VALUES ($1, $2, $3, $4, $5, $5, $6)',
    [`robot-${n}`, 'b-robot', n % 80 || 80, readOn, at, readerId],
  );
}
const now = () => new Date().toISOString();
const counts = (challenge: Challenge) => challenge.standings.map((s) => [s.name, s.count, s.rank, s.leading]);

test('Given Dad starts a two-week chapters challenge for Nia and Theo, then it starts today, ends 13 days on, and every reader is at 0', async () => {
  const cookie = await dad();
  const created = await start(cookie);
  assert.equal(created.startsOn, TODAY());
  assert.equal(created.endsOn, day(13));
  assert.equal(created.daysLeft, 13);
  assert.equal(created.ended, false);
  assert.deepEqual(counts(created), [
    ['Nia', 0, 1, false],
    ['Theo', 0, 1, false],
  ]);
  const read = await view(cookie);
  assert.equal(read.current?.id, created.id);
  assert.deepEqual(read.past, []);
  assert.deepEqual(read.readers.map((r) => r.name), ['Nia', 'Theo']);
});

test('Given one week or a month, then the challenge ends 6 or 29 days after today', async () => {
  const cookie = await dad();
  const week = await start(cookie, { ...RACE, length: 'week' });
  assert.equal(week.endsOn, day(6));
  await db.pool.query('UPDATE challenge SET ended_at = $1 WHERE id = $2', [now(), week.id]);
  const month = await start(cookie, { ...RACE, length: 'month' });
  assert.equal(month.endsOn, day(29));
});

test('Given chapters logged by each reader during the challenge, then the leaderboard counts them, highest first, the sole leader crowned', async () => {
  const cookie = await dad();
  await start(cookie);
  await logged('p-theo', now());
  await logged('p-nia', now());
  await logged('p-nia', now());
  await logged('p-nia', now());
  const { current } = await view(cookie);
  assert.deepEqual(counts(current!), [
    ['Nia', 3, 1, true],
    ['Theo', 1, 2, false],
  ]);
});

test('Given equal counts, then the readers share the rank and the lead, ordered by name', async () => {
  const cookie = await dad();
  await start(cookie);
  await logged('p-theo', now());
  await logged('p-nia', now());
  assert.deepEqual(counts((await view(cookie)).current!), [
    ['Nia', 1, 1, true],
    ['Theo', 1, 1, true],
  ]);
});

test('Given chapters logged before the start, by a parent, by nobody known, or by a reader not taking part, then they count for no one', async () => {
  const cookie = await dad();
  await start(cookie, { ...RACE, readerIds: ['p-nia'] });
  await logged('p-nia', `${day(-1)}T12:00:00.000Z`);
  await logged(null, now());
  await logged('p-theo', now());
  assert.deepEqual(counts((await view(cookie)).current!), [['Nia', 0, 1, false]]);
});

test('Given a reader logs a chapter through the API, then it is stored as hers and counts for her', async () => {
  const cookie = await dad();
  await start(cookie);
  const reader = await nia();
  const response = await call(reader, 'POST', '/books/b-robot/chapters/4', { readOn: TODAY(), answers: [{ position: 1, text: 'The robot woke up.' }] });
  assert.equal(response.status, 201);
  const row = await get<{ reader_id: string }>(db.pool, "SELECT reader_id FROM chapter_log WHERE book_id = 'b-robot' AND chapter_number = 4");
  assert.equal(row?.reader_id, 'p-nia');
  assert.deepEqual(counts((await view(cookie)).current!)[0], ['Nia', 1, 1, true]);
});

test('Given a parent logs a chapter, then it names no reader', async () => {
  const cookie = await dad();
  const response = await call(cookie, 'POST', '/books/b-robot/chapters/4', { readOn: TODAY(), answers: [{ position: 1, text: 'Dad read it.' }] });
  assert.equal(response.status, 201);
  const row = await get<{ reader_id: string | null }>(db.pool, "SELECT reader_id FROM chapter_log WHERE book_id = 'b-robot' AND chapter_number = 4");
  assert.equal(row?.reader_id, null);
});

test('Given the household time zone, then a chapter logged late on the last day counts and one just after midnight does not', async () => {
  const cookie = await dad();
  await db.pool.query("UPDATE household SET time_zone = 'America/Vancouver' WHERE id = $1", [SEED.householdId]);
  const created = await start(cookie, { ...RACE, length: 'week' });
  // Move the window so that it ended yesterday in Vancouver, and log around its last midnight.
  const lastDay = created.endsOn;
  await db.pool.query('UPDATE challenge SET starts_on = $1, ends_on = $1 WHERE id = $2', [lastDay, created.id]);
  const vancouverMidnightAfter = new Date(`${lastDay}T00:00:00-07:00`);
  vancouverMidnightAfter.setUTCDate(vancouverMidnightAfter.getUTCDate() + 1);
  await logged('p-nia', new Date(vancouverMidnightAfter.getTime() - 30 * 60_000).toISOString(), lastDay);
  await logged('p-theo', new Date(vancouverMidnightAfter.getTime() + 10 * 60_000).toISOString(), lastDay);
  await logged('p-theo', new Date(vancouverMidnightAfter.getTime() + 20 * 60_000).toISOString(), lastDay);
  assert.deepEqual(counts((await view(cookie)).current!), [
    ['Nia', 1, 1, true],
    ['Theo', 0, 2, false],
  ]);
});

test('Given a books challenge, then a book finished during it counts for the reader who logged its last chapter', async () => {
  const cookie = await dad();
  await start(cookie, { ...RACE, measure: 'books' });
  // The BFG has 3 chapters and 2 logged; Theo logs the last one.
  const at = now();
  await db.pool.query("INSERT INTO chapter_log (id, book_id, chapter_number, read_on, logged_at, undo_until, reader_id) VALUES ('bfg-3', 'b-bfg', 3, $1, $2, $2, 'p-theo')", [TODAY(), at]);
  await db.pool.query("UPDATE book SET finished_at = $1 WHERE id = 'b-bfg'", [at]);
  await logged('p-nia', now());
  assert.deepEqual(counts((await view(cookie)).current!), [
    ['Theo', 1, 1, true],
    ['Nia', 0, 2, false],
  ]);
});

test('Given a reader, then she can read the challenges but not start one', async () => {
  const cookie = await dad();
  await start(cookie);
  const reader = await nia();
  assert.equal((await view(reader)).current?.name, 'Half-term reading race');
  const response = await call(reader, 'POST', '/challenges', RACE);
  assert.equal(response.status, 403);
  assert.equal(((await response.json()) as { type: string }).type, 'grown-ups-only');
});

test('Given no session, then every challenge route answers 401', async () => {
  for (const [method, path] of [['GET', '/challenges'], ['POST', '/challenges'], ['POST', '/challenges/x/end'], ['POST', '/challenges/x/reward'], ['DELETE', '/challenges/x']]) {
    assert.equal((await call(null, method!, path!, method === 'GET' ? undefined : {})).status, 401, `${method} ${path}`);
  }
});

test('Given another household, then it sees none of this household’s challenges, readers or counts', async () => {
  await start(await dad());
  await logged('p-nia', now());
  const other = await view(await zedsDad());
  assert.equal(other.current, null);
  assert.deepEqual(other.readers.map((r) => r.name), ['Zed']);
});

test('Given another household’s reader, then Dad cannot add her to a challenge', async () => {
  const response = await call(await dad(), 'POST', '/challenges', { ...RACE, readerIds: ['p-nia', 'p-other-reader'] });
  assert.equal(response.status, 400);
  assert.equal(((await response.json()) as { type: string }).type, 'validation');
});

test('Given chapters logged before this release, then a household with one reader gets them and one with two keeps them unnamed', async () => {
  const fresh = await createTestDatabase({ migrated: false });
  const migrations = fileURLToPath(new URL('../migrations/', import.meta.url));
  const before = mkdtempSync(join(tmpdir(), 'shelfie-before-challenges-'));
  for (const file of readdirSync(migrations).filter((f) => f < '011')) copyFileSync(join(migrations, file), join(before, file));
  try {
    await migrate(fresh.pool, pathToFileURL(`${before}/`));
    const q = (sql: string) => fresh.pool.query(sql);
    await q("INSERT INTO household (id) VALUES ('solo'), ('pair')");
    await q("INSERT INTO profile (id, household_id, role, name, color, username) VALUES ('r1', 'solo', 'reader', 'Nia', 'rose', 'nia'), ('r2', 'pair', 'reader', 'Ava', 'sky', 'ava'), ('r3', 'pair', 'reader', 'Ben', 'sun', 'ben')");
    await q("INSERT INTO book (id, household_id, title, chapter_count, cover_color, sticker, created_at) VALUES ('bs', 'solo', 'A', 3, 'rose', '📚', '2026-10-01'), ('bp', 'pair', 'B', 3, 'rose', '📚', '2026-10-01')");
    await q("INSERT INTO chapter_log (id, book_id, chapter_number, read_on, logged_at, undo_until) VALUES ('cs', 'bs', 1, '2026-10-02', '2026-10-02', '2026-10-02'), ('cp', 'bp', 1, '2026-10-02', '2026-10-02', '2026-10-02')");

    await migrate(fresh.pool);

    assert.equal((await get<{ reader_id: string | null }>(fresh.pool, "SELECT reader_id FROM chapter_log WHERE id = 'cs'"))?.reader_id, 'r1');
    assert.equal((await get<{ reader_id: string | null }>(fresh.pool, "SELECT reader_id FROM chapter_log WHERE id = 'cp'"))?.reader_id, null);
  } finally {
    await fresh.drop();
  }
});

test('Given a challenge running, when Dad starts another, then the API answers 409 challenge-running and stores nothing', async () => {
  const cookie = await dad();
  await start(cookie);
  const response = await call(cookie, 'POST', '/challenges', { ...RACE, name: 'Second' });
  assert.equal(response.status, 409);
  assert.equal(((await response.json()) as { type: string }).type, 'challenge-running');
  assert.equal((await get<{ n: number }>(db.pool, 'SELECT COUNT(*)::int AS n FROM challenge'))?.n, 1);
});

test('Given the running challenge has ended, then Dad can start the next one, and the last becomes past', async () => {
  const cookie = await dad();
  const first = await start(cookie);
  await db.pool.query('UPDATE challenge SET ended_at = $1 WHERE id = $2', [now(), first.id]);
  const second = await start(cookie, { ...RACE, name: 'Second' });
  const read = await view(cookie);
  assert.equal(read.current?.id, second.id);
  assert.deepEqual(read.past.map((c) => c.id), [first.id]);
});

test('Given one household runs a challenge, then another household can still start its own', async () => {
  await start(await dad());
  const response = await call(await zedsDad(), 'POST', '/challenges', { ...RACE, readerIds: ['p-other-reader'] });
  assert.equal(response.status, 201);
});

test('Given a name, measure, goal, length or readers the rules refuse, then the API answers 400 validation naming the field and stores nothing', async () => {
  const cookie = await dad();
  const cases: [object, string][] = [
    [{ name: '   ' }, 'name'],
    [{ name: 'x'.repeat(61) }, 'name'],
    [{ measure: 'minutes' }, 'measure'],
    [{ goal: 0 }, 'goal'],
    [{ goal: 501 }, 'goal'],
    [{ goal: 2.5 }, 'goal'],
    [{ length: 'year' }, 'length'],
    [{ readerIds: [] }, 'readerIds'],
    [{ readerIds: ['p-nia', 'p-nia'] }, 'readerIds'],
    [{ readerIds: ['p-dad'] }, 'readerIds'],
  ];
  for (const [change, field] of cases) {
    const response = await call(cookie, 'POST', '/challenges', { ...RACE, ...change });
    assert.equal(response.status, 400, JSON.stringify(change));
    const problem = (await response.json()) as { type: string; errors: { field: string }[] };
    assert.equal(problem.type, 'validation');
    assert.ok(problem.errors.some((e) => e.field === field), `${JSON.stringify(change)} names ${field}`);
  }
  assert.equal((await get<{ n: number }>(db.pool, 'SELECT COUNT(*)::int AS n FROM challenge'))?.n, 0);
});

/** Clears Nia's seeded logs and stores chapters read on these days ago, by reader. */
async function readOn(days: Record<string, number[]>) {
  await db.pool.query('DELETE FROM chapter_log WHERE book_id IN (SELECT id FROM book WHERE household_id = $1)', [SEED.householdId]);
  for (const [readerId, ago] of Object.entries(days)) {
    for (const a of ago) await logged(readerId, `${day(-a)}T12:00:00.000Z`);
  }
}

test('Given chapters read this week and last, then the insights name the top reader, the biggest climber and the longest streak', async () => {
  const cookie = await dad();
  await start(cookie);
  await readOn({
    // Nia: 4 this week (today and the 3 days before), 4 last week; streak 4.
    'p-nia': [0, 1, 2, 3, 8, 9, 10, 11],
    // Theo: 3 this week, 0 last week; streak 1.
    'p-theo': [0, 4, 5],
  });
  const { insights } = (await view(cookie)).current!;
  assert.deepEqual(insights, {
    topReader: { name: 'Nia', count: 4 },
    climber: { name: 'Theo', gain: 3 },
    streak: { name: 'Nia', days: 4 },
  });
});

test('Given nobody read more than the week before, then there is no climber; given equal tops, the first by name is named', async () => {
  const cookie = await dad();
  await start(cookie);
  await readOn({ 'p-theo': [0, 8, 9], 'p-nia': [1, 9, 10] });
  const { insights } = (await view(cookie)).current!;
  assert.equal(insights?.climber, null);
  assert.deepEqual(insights?.topReader, { name: 'Nia', count: 1 });
});

test('Given nobody read in the last 7 days, then there is no top reader and no streak', async () => {
  const cookie = await dad();
  await start(cookie);
  await readOn({ 'p-nia': [9] });
  assert.deepEqual((await view(cookie)).current!.insights, { topReader: null, climber: null, streak: null });
});

test('Given only Nia takes part, then Theo’s reading never appears in the insights', async () => {
  const cookie = await dad();
  await start(cookie, { ...RACE, readerIds: ['p-nia'] });
  await readOn({ 'p-nia': [1], 'p-theo': [0, 1, 2] });
  const { insights } = (await view(cookie)).current!;
  assert.equal(insights?.topReader?.name, 'Nia');
  assert.equal(insights?.streak?.name, 'Nia');
});

test('Given a challenge whose last day has passed, when it is read, then it has ended, counts nothing more, and a new one can start', async () => {
  const cookie = await dad();
  const created = await start(cookie, { ...RACE, length: 'week' });
  await db.pool.query('UPDATE challenge SET starts_on = $1, ends_on = $2 WHERE id = $3', [day(-7), day(-1), created.id]);
  await readOn({});
  await logged('p-nia', `${day(-2)}T12:00:00.000Z`);
  await logged('p-theo', now());

  const { current } = await view(cookie);
  assert.equal(current?.ended, true);
  assert.equal(current?.insights, null);
  assert.deepEqual(counts(current!), [
    ['Nia', 1, 1, true],
    ['Theo', 0, 2, false],
  ]);
  assert.deepEqual(current?.winners, ['p-nia']);
  assert.ok((await get<{ ended_at: string | null }>(db.pool, 'SELECT ended_at FROM challenge WHERE id = $1', [created.id]))?.ended_at);
  await start(cookie, { ...RACE, name: 'Next' });
});

test('Given a running challenge, when Dad ends it now, then today is its last day, later chapters count for no one, and it cannot end twice', async () => {
  const cookie = await dad();
  const created = await start(cookie);
  await logged('p-theo', now());
  const response = await call(cookie, 'POST', `/challenges/${created.id}/end`);
  assert.equal(response.status, 200);
  const ended = (await response.json()) as Challenge;
  assert.equal(ended.ended, true);
  assert.equal(ended.endsOn, TODAY());
  assert.deepEqual(ended.winners, ['p-theo']);

  await logged('p-nia', new Date(Date.now() + 1000).toISOString());
  await logged('p-nia', new Date(Date.now() + 2000).toISOString());
  assert.deepEqual(counts((await view(cookie)).current!), [
    ['Theo', 1, 1, true],
    ['Nia', 0, 2, false],
  ]);

  const again = await call(cookie, 'POST', `/challenges/${created.id}/end`);
  assert.equal(again.status, 409);
  assert.equal(((await again.json()) as { type: string }).type, 'challenge-ended');
});

test('Given an ended challenge, then the winners are every leader, none when nothing counted, and a lone reader only at the goal', async () => {
  const cookie = await dad();
  const empty = await start(cookie, { ...RACE, name: 'Empty' });
  assert.deepEqual(((await (await call(cookie, 'POST', `/challenges/${empty.id}/end`)).json()) as Challenge).winners, []);

  const tie = await start(cookie);
  await logged('p-nia', now());
  await logged('p-theo', now());
  assert.deepEqual(((await (await call(cookie, 'POST', `/challenges/${tie.id}/end`)).json()) as Challenge).winners, ['p-nia', 'p-theo']);

  // The window is days, so Nia's chapter from earlier today counts in the next challenges too.
  const short = await start(cookie, { ...RACE, name: 'Short', goal: 2, readerIds: ['p-nia'] });
  assert.deepEqual(((await (await call(cookie, 'POST', `/challenges/${short.id}/end`)).json()) as Challenge).winners, []);

  const reached = await start(cookie, { ...RACE, name: 'Reached', goal: 1, readerIds: ['p-nia'] });
  assert.deepEqual(((await (await call(cookie, 'POST', `/challenges/${reached.id}/end`)).json()) as Challenge).winners, ['p-nia']);
});

test('Given an ended challenge with a winner, when Dad gives a reward, then it is stored once and shows on the challenge', async () => {
  const cookie = await dad();
  const created = await start(cookie);
  const early = await call(cookie, 'POST', `/challenges/${created.id}/reward`, { text: 'Ice cream Saturday' });
  assert.equal(early.status, 409);
  assert.equal(((await early.json()) as { type: string }).type, 'challenge-running');

  await logged('p-nia', now());
  await call(cookie, 'POST', `/challenges/${created.id}/end`);
  assert.equal((await call(cookie, 'POST', `/challenges/${created.id}/reward`, { text: '  ' })).status, 400);
  const given = await call(cookie, 'POST', `/challenges/${created.id}/reward`, { text: 'Ice cream Saturday', note: 'Well read!' });
  assert.equal(given.status, 201);
  assert.deepEqual(((await given.json()) as Challenge).reward, { text: 'Ice cream Saturday', note: 'Well read!' });
  assert.deepEqual((await view(await nia())).current?.reward, { text: 'Ice cream Saturday', note: 'Well read!' });

  const twice = await call(cookie, 'POST', `/challenges/${created.id}/reward`, { text: 'Movie night' });
  assert.equal(twice.status, 409);
  assert.equal(((await twice.json()) as { type: string }).type, 'reward-exists');
});

test('Given an ended challenge nobody won, then no reward can be given', async () => {
  const cookie = await dad();
  const created = await start(cookie);
  await call(cookie, 'POST', `/challenges/${created.id}/end`);
  const response = await call(cookie, 'POST', `/challenges/${created.id}/reward`, { text: 'Ice cream Saturday' });
  assert.equal(response.status, 409);
  assert.equal(((await response.json()) as { type: string }).type, 'no-winner');
});

test('Given a reader or another household, then ending and rewarding are refused and nothing changes', async () => {
  const cookie = await dad();
  const created = await start(cookie);
  for (const path of [`/challenges/${created.id}/end`, `/challenges/${created.id}/reward`]) {
    const reader = await call(await nia(), 'POST', path, { text: 'Sweets' });
    assert.equal(reader.status, 403, path);
    const other = await call(await zedsDad(), 'POST', path, { text: 'Sweets' });
    assert.equal(other.status, 404, path);
  }
  assert.equal((await view(cookie)).current?.ended, false);
});
