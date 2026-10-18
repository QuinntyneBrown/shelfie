// Traces to: L2-032, L2-037
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.ts';
import { openDb } from './db.ts';
import { createTestDatabase } from './test-db.ts';

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
  const db = await createTestDatabase();
  try {
    const response = await get(createApp(db.pool), '/api/health');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  } finally {
    await db.drop();
  }
});

test('Given the database cannot be reached, then health answers 503 unavailable within 5 s', async () => {
  // Nothing listens on port 1 (and a connect attempt there is refused, not swallowed).
  const db = openDb('postgres://shelfie:nope@127.0.0.1:1/shelfie');
  const started = performance.now();
  const response = await get(createApp(db, { log: () => {} }), '/api/health');
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'unavailable' });
  assert.ok(performance.now() - started < 5000);
  await db.end();
});
