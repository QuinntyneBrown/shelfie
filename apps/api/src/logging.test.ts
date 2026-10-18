// Traces to: L2-029, L2-032
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createApp } from './app.ts';
import { openDb } from './db.ts';
import { requestLogging } from './logging.ts';
import { problemDetailsHandler } from './errors.ts';

type Line = Record<string, unknown>;

async function call(app: express.Express, path: string, init?: RequestInit) {
  const server = app.listen(0);
  try {
    const { port } = server.address() as { port: number };
    const response = await fetch(`http://localhost:${port}${path}`, init);
    const text = await response.text();
    await new Promise((resolve) => setTimeout(resolve, 20));
    return Object.assign(response, { text_: text });
  } finally {
    server.close();
  }
}

test('Given a request, then one line is logged with its request id, method, route pattern, status and duration', async () => {
  const lines: Line[] = [];
  const app = createApp(openDb(':memory:'), { log: (line) => lines.push(line) });

  const response = await call(app, '/api/books/some-book-id');

  assert.equal(lines.length, 1);
  const [line] = lines;
  assert.match(String(line['requestId']), /^SHF-[0-9A-F]{4}$/);
  assert.equal(response.headers.get('x-request-id'), line['requestId']);
  assert.equal(line['method'], 'GET');
  assert.equal(line['route'], '/api/books/:id');
  assert.equal(line['status'], 401);
  assert.equal(typeof line['durationMs'], 'number');
  assert.ok(!JSON.stringify(line).includes('some-book-id'), 'ids in the URL are not logged');
});

test('Given a sign-in with a password and a cookie, then nothing secret reaches the log', async () => {
  const lines: Line[] = [];
  const app = createApp(openDb(':memory:'), { log: (line) => lines.push(line) });

  await call(app, '/api/auth/password', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-requested-with': 'Shelfie', cookie: 'shelfie_session=secret-session-id' },
    body: JSON.stringify({ email: 'dad@example.com', password: 'my-secret-password', pin: '1234' }),
  });

  const logged = JSON.stringify(lines);
  for (const secret of ['my-secret-password', 'secret-session-id', '1234', 'dad@example.com']) {
    assert.ok(!logged.includes(secret), `${secret} must not be logged`);
  }
});

test('Given an unhandled error, then it is logged with the request id the user is shown, and the body has no internals', async () => {
  const lines: Line[] = [];
  const app = express();
  app.use(requestLogging((line) => lines.push(line)));
  app.get('/boom', () => {
    throw new Error('SELECT * FROM secret_table');
  });
  app.use(problemDetailsHandler);

  const response = await call(app, '/boom');
  const requestId = response.headers.get('x-request-id');
  const errorLine = lines.find((l) => l['level'] === 'error');
  assert.equal(response.status, 500);
  assert.equal(errorLine?.['requestId'], requestId);
  assert.ok(String(errorLine?.['error']).includes('secret_table'), 'the log keeps the detail');
  assert.equal(JSON.parse(response.text_).requestId, requestId);
  assert.ok(!response.text_.includes('secret_table'), 'the body does not');
});
