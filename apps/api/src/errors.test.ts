// Traces to: L2-005
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { problemDetailsHandler } from './errors.ts';

test('Given a request fails unexpectedly, then the caller gets a 500 with a request id and no stack trace', async (t) => {
  const logged = t.mock.method(console, 'error', () => {});
  const app = express();
  app.get('/boom', () => {
    throw new Error('secret internals');
  });
  app.use(problemDetailsHandler);
  const server = app.listen(0);
  try {
    const { port } = server.address() as { port: number };
    const response = await fetch(`http://localhost:${port}/boom`);
    const body = await response.json();
    const text = JSON.stringify(body);

    assert.equal(response.status, 500);
    assert.equal(body.title, 'Something went wrong');
    assert.match(body.requestId, /^SHF-[0-9A-F]{4}$/);
    assert.ok(!text.includes('secret internals') && !text.includes('at '), 'no internals in the body');
    assert.ok(String(logged.mock.calls[0].arguments.join(' ')).includes(body.requestId), 'the log carries the same id');
  } finally {
    server.close();
  }
});
