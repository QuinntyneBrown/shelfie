// Traces to: L2-137, L2-142
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { call, seededDb } from './admin-test-api.ts';
import { createApp } from './app.ts';
import { configuredProviders } from './oauth.ts';

const BOTH = { GOOGLE_CLIENT_ID: 'google-id', GOOGLE_CLIENT_SECRET: 'google-secret', FACEBOOK_CLIENT_ID: 'facebook-id', FACEBOOK_CLIENT_SECRET: 'facebook-secret' };

test('Given both providers are configured, when the providers are asked for, then both names come back and nothing else', async () => {
  const db = await seededDb();
  const app = createApp(db, { log: () => {}, providers: configuredProviders(BOTH) });

  const response = await call(db, 'GET', '/api/auth/providers', { app });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { providers: ['google', 'facebook'] });
  assert.ok(!response.text.includes('secret') && !response.text.includes('google-id'));
});

test('Given only Google has both values and Facebook lacks its secret, then only Google is configured', () => {
  assert.deepEqual(configuredProviders({ ...BOTH, FACEBOOK_CLIENT_SECRET: '' }).map((p) => p.name), ['google']);
  assert.deepEqual(configuredProviders({}), []);
});
