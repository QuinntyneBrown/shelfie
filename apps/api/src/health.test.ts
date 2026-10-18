// Traces to: L2-032
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.ts';
import { openDb } from './db.ts';

async function get(app: ReturnType<typeof createApp>, path: string) {
  const server = app.listen(0);
  try {
    const { port } = server.address() as { port: number };
    return await fetch(`http://localhost:${port}${path}`);
  } finally {
    server.close();
  }
}

test('Given the database is reachable, then health answers 200 ok', async () => {
  const response = await get(createApp(openDb(':memory:')), '/api/health');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('Given the database cannot be reached, then health answers 503 unavailable', async (t) => {
  t.mock.method(console, 'error', () => {});
  const db = openDb(':memory:');
  db.close();
  const response = await get(createApp(db), '/api/health');
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'unavailable' });
});
