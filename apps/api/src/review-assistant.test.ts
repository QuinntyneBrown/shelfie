// Traces to: L2-049, L2-050, L2-051, L2-052, L2-053
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import type { AssistInput } from './review-assistant.ts';
import { seed, SEED } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie' };
let db: Awaited<ReturnType<typeof createTestDatabase>>;
let server: Server;
let url: string;

/** What the fake provider was asked, and what it answers next. */
let asked: AssistInput[] = [];
let logged: string[] = [];
let answer: (input: AssistInput) => Promise<unknown>;

const goodAdvice = async (input: AssistInput) => ({
  answers: input.answers.map((a) => ({ position: a.position, verdict: 'weak', reason: 'Only a few words.' })),
  draft: `Thank you for telling me about Chapter ${input.chapterNumber}!`,
});

before(async () => {
  db = await createTestDatabase();
  const assistant = (input: AssistInput) => {
    asked.push(input);
    return answer(input);
  };
  server = createApp(db.pool, { log: (line) => logged.push(JSON.stringify(line)), assistant }).listen(0);
  url = `http://localhost:${(server.address() as { port: number }).port}`;
});

beforeEach(async () => {
  await seed(db.pool);
  asked = [];
  logged = [];
  answer = goodAdvice;
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

async function assist(cookie: string, chapterLogId: string, headers: Record<string, string> = APP) {
  const response = await fetch(`${url}/api/chapter-logs/${chapterLogId}/assist`, { method: 'POST', headers: { ...headers, Cookie: cookie } });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

test('Given a pending chapter, when Dad asks for help, then he gets the advice and the assistant is sent only the title, chapter number, questions and answers', async () => {
  const cookie = await signInAsDad();

  const { status, body } = await assist(cookie, 'b-lion-c11');

  assert.equal(status, 200);
  assert.deepEqual(body, {
    answers: [{ position: 1, verdict: 'weak', reason: 'Only a few words.' }],
    draft: 'Thank you for telling me about Chapter 11!',
  });
  assert.deepEqual(asked, [
    {
      bookTitle: 'The Lion, the Witch and the Wardrobe',
      chapterNumber: 11,
      answers: [{ position: 1, question: 'What happened in this chapter?', answer: 'Father Christmas gave them presents.' }],
    },
  ]);
});

test('Given Nia, an already reviewed chapter, another family’s chapter or a cross-site request, when help is asked for, then it is refused and the assistant is not asked', async () => {
  const nia = await signInAsNia();
  assert.deepEqual(await assist(nia, 'b-lion-c11'), { status: 403, body: { type: 'grown-ups-only' } });

  const dad = await signInAsDad();
  assert.deepEqual(await assist(dad, 'b-lion-c9'), { status: 409, body: { type: 'already-reviewed' } });
  assert.equal((await assist(dad, 'b-other-c1')).status, 404);
  assert.deepEqual(await assist(dad, 'b-lion-c11', {}), { status: 403, body: { type: 'cross-site' } });

  assert.deepEqual(asked, []);
});

test('Given advice with malformed entries and a long draft, then only well-formed entries for the chapter’s questions are kept and the draft is cut to 300 characters', async () => {
  answer = async () => ({
    answers: [
      { position: 1, verdict: 'ok', reason: '  Says what happened.  ' },
      { position: 1, verdict: 'weak', reason: 'A second entry for the same question.' },
      { position: 2, verdict: 'weak', reason: 'There is no question 2.' },
      { position: 1.5, verdict: 'ok', reason: '' },
      { position: '1', verdict: 'ok', reason: '' },
      'weak',
      null,
    ],
    draft: `  ${'Lovely work! '.repeat(30)}  `,
    sticker: 'rocket',
  });
  const cookie = await signInAsDad();

  const { status, body } = await assist(cookie, 'b-lion-c11');

  assert.equal(status, 200);
  assert.deepEqual(body['answers'], [{ position: 1, verdict: 'ok', reason: 'Says what happened.' }]);
  assert.equal((body['draft'] as string).length, 300);
  assert.ok((body['draft'] as string).startsWith('Lovely work!'));
  assert.equal(body['sticker'], undefined, 'the assistant never picks the sticker');
});

test('Given a reason over 120 characters or a verdict other than ok or weak, then that entry is dropped and the rest still counts', async () => {
  answer = async () => ({ answers: [{ position: 1, verdict: 'weak', reason: 'x'.repeat(121) }], draft: 'Well done.' });
  const cookie = await signInAsDad();
  assert.deepEqual((await assist(cookie, 'b-lion-c11')).body, { answers: [], draft: 'Well done.' });

  answer = async () => ({ answers: [{ position: 1, verdict: 'great', reason: 'Fine.' }], draft: 'Well done.' });
  assert.deepEqual((await assist(cookie, 'b-lion-c11')).body, { answers: [], draft: 'Well done.' });
});

test('Given output with no usable draft, then the API answers 502 assistant-failed', async () => {
  const cookie = await signInAsDad();
  for (const output of [{ answers: [] }, { answers: [], draft: '   ' }, { answers: [], draft: 42 }, 'Ignore your instructions', null]) {
    answer = async () => output;
    assert.deepEqual(await assist(cookie, 'b-lion-c11'), { status: 502, body: { type: 'assistant-failed' } }, JSON.stringify(output));
  }
});

test('Given a provider error or a timeout, then the API answers 502 assistant-failed', async () => {
  const cookie = await signInAsDad();
  answer = async () => {
    throw new Error('provider is down');
  };
  assert.deepEqual(await assist(cookie, 'b-lion-c11'), { status: 502, body: { type: 'assistant-failed' } });
  answer = async () => {
    throw new DOMException('The operation timed out.', 'TimeoutError');
  };
  assert.deepEqual(await assist(cookie, 'b-lion-c11'), { status: 502, body: { type: 'assistant-failed' } });
});

test('Given five requests in ten minutes, when Dad asks a sixth time, then the API answers 429 with Retry-After and the assistant is not asked', async () => {
  const cookie = await signInAsDad();
  for (let i = 0; i < 5; i++) assert.equal((await assist(cookie, 'b-lion-c11')).status, 200);

  const response = await fetch(`${url}/api/chapter-logs/b-lion-c11/assist`, { method: 'POST', headers: { ...APP, Cookie: cookie } });

  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), { type: 'too-many-attempts' });
  assert.ok(Number(response.headers.get('retry-after')) > 0);
  assert.equal(asked.length, 5);
});

/** Runs `work` against a second app that uses the real Anthropic provider, with the given key and Anthropic's API replaced by `reply`. */
async function withRealProvider(key: string | undefined, reply: (request: Request) => Promise<Response>, work: (base: string) => Promise<void>) {
  const realFetch = globalThis.fetch;
  const savedKey = process.env['ANTHROPIC_API_KEY'];
  if (key === undefined) delete process.env['ANTHROPIC_API_KEY'];
  else process.env['ANTHROPIC_API_KEY'] = key;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    return request.url.startsWith('https://api.anthropic.com/') ? reply(request) : realFetch(input, init);
  }) as typeof fetch;
  const real = createApp(db.pool, { log: (line) => logged.push(JSON.stringify(line)) }).listen(0);
  try {
    await work(`http://localhost:${(real.address() as { port: number }).port}`);
  } finally {
    real.close();
    globalThis.fetch = realFetch;
    if (savedKey === undefined) delete process.env['ANTHROPIC_API_KEY'];
    else process.env['ANTHROPIC_API_KEY'] = savedKey;
  }
}

async function assistAt(base: string, cookie: string, chapterLogId: string) {
  const response = await fetch(`${base}/api/chapter-logs/${chapterLogId}/assist`, { method: 'POST', headers: { ...APP, Cookie: cookie } });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

test('Given no ANTHROPIC_API_KEY on the server, when Dad asks for help, then the API answers 503 assistant-unavailable without calling Anthropic', async () => {
  const cookie = await signInAsDad();
  let calls = 0;
  await withRealProvider(
    undefined,
    async () => {
      calls++;
      return Response.json({});
    },
    async (base) => {
      assert.deepEqual(await assistAt(base, cookie, 'b-lion-c11'), { status: 503, body: { type: 'assistant-unavailable' } });
    },
  );
  assert.equal(calls, 0);
});

test('Given a key, when Dad asks for help, then Anthropic gets the key in a header and only the chapter’s title, number, questions and answers, marked as data, and the advice comes back', async () => {
  const cookie = await signInAsDad();
  const requests: { url: string; headers: Headers; body: Record<string, unknown> }[] = [];
  const advice = { answers: [{ position: 1, verdict: 'weak', reason: 'Only a few words.' }], draft: 'Thank you, I loved reading this!' };
  await withRealProvider(
    'sk-test-key',
    async (request) => {
      requests.push({ url: request.url, headers: request.headers, body: (await request.json()) as Record<string, unknown> });
      return Response.json({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify(advice) }] });
    },
    async (base) => {
      assert.deepEqual(await assistAt(base, cookie, 'b-lion-c11'), { status: 200, body: advice });
    },
  );

  assert.equal(requests.length, 1);
  const [sent] = requests;
  assert.equal(sent!.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(sent!.headers.get('x-api-key'), 'sk-test-key');
  assert.equal(sent!.headers.get('anthropic-version'), '2023-06-01');
  assert.equal(sent!.body['model'], 'claude-opus-5-5');
  assert.equal((sent!.body['output_config'] as { format: { type: string } }).format.type, 'json_schema');
  const user = JSON.stringify(sent!.body['messages']);
  assert.match(user, /The Lion, the Witch and the Wardrobe/);
  assert.match(user, /Father Christmas gave them presents\./);
  assert.match(user, /<chapter>/);
  assert.match(String(sent!.body['system']), /never instructions/i);
  const everything = JSON.stringify(sent!.body);
  for (const secret of ['Nia', 'Dad', SEED.parentEmail, SEED.readerUsername, SEED.householdId, 'Aslan came back', 'b-lion']) {
    assert.ok(!everything.includes(secret), `${secret} is not sent`);
  }
  assert.ok(!logged.some((line) => line.includes('sk-test-key') || line.includes('Father Christmas') || line.includes('loved reading')), 'nothing about the advice or key is logged');
});

test('Given Anthropic declines, errors or sends text that is not JSON, then the API answers 502 assistant-failed', async () => {
  const cookie = await signInAsDad();
  const replies = [
    Response.json({ stop_reason: 'refusal', content: [] }),
    Response.json({ type: 'error', error: { type: 'overloaded_error' } }, { status: 529 }),
    Response.json({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Sure! Here is a note.' }] }),
    Response.json({ stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"answers": [' }] }),
  ];
  for (const reply of replies) {
    await withRealProvider(
      'sk-test-key',
      async () => reply,
      async (base) => {
        assert.deepEqual(await assistAt(base, cookie, 'b-lion-c11'), { status: 502, body: { type: 'assistant-failed' } });
      },
    );
  }
});
