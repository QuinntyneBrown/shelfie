import { test as base } from '@playwright/test';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { createApp } from '../../apps/api/src/app.ts';
import { seed } from '../../apps/api/src/seed.ts';
import { createTestDatabase } from '../../apps/api/src/test-db.ts';
import { useDatabase } from './database';
import { fakeAssistant, resetAssistant } from './assistant';
import { fakeAi, fakeCatalogue, fakeCoverFetch, fakeWorkCovers } from './lookup';
import { clearMailbox, deliver } from './mailbox';
import { suggest, suggestIdeas } from './suggestions';

const WEB = join(import.meta.dirname, '../../apps/web/dist/shelfie/browser');
const MARKETING = join(import.meta.dirname, '../../apps/marketing');
// The policy Caddy sends for www.shelfie.kids (infra/host/Caddyfile), so tests see what production blocks.
const MARKETING_CSP =
  "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self'";

interface Stack {
  db: Awaited<ReturnType<typeof createTestDatabase>>;
  url: string;
}

// Each worker runs its own copy of the API over a database of its own on the PostgreSQL server at
// DATABASE_URL and serves the built web app from the same port, so tests never share state. The static
// marketing site is served under /marketing/.
export const test = base.extend<{ seeded: void; shelf: 'books' | 'empty' }, { stack: Stack }>({
  stack: [
    async ({}, use) => {
      const db = await createTestDatabase();
      const app = express();
      app.use(createApp(db.pool, { log: () => {}, mail: deliver, assistant: fakeAssistant, suggest, catalogue: fakeCatalogue, ai: fakeAi, coverFetch: fakeCoverFetch, workCovers: fakeWorkCovers }));
      app.use('/marketing', (_req, res, next) => (res.set('Content-Security-Policy', MARKETING_CSP), next()), express.static(MARKETING));
      app.use(express.static(WEB));
      app.use((_req, res) => res.sendFile(join(WEB, 'index.html')));
      const server = app.listen(0);
      await new Promise((resolve) => server.once('listening', resolve));
      const url = `http://localhost:${(server.address() as AddressInfo).port}`;
      process.env.APP_URL = url; // Reset links point at this worker's app.
      useDatabase(db.pool);
      await use({ db, url });
      server.closeAllConnections();
      server.close();
      await db.drop();
    },
    { scope: 'worker' },
  ],
  baseURL: async ({ stack }, use) => use(stack.url),
  shelf: ['books', { option: true }],
  // Every test starts from the seeded household: no sessions, no mail, a working assistant.
  seeded: [
    async ({ stack, shelf }, use) => {
      await seed(stack.db.pool, { books: shelf !== 'empty' });
      clearMailbox();
      resetAssistant();
      suggestIdeas();
      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
