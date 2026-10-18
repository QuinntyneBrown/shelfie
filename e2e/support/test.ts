import { test as base } from '@playwright/test';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { createApp } from '../../apps/api/src/app.ts';
import { openDb } from '../../apps/api/src/db.ts';
import { seed } from '../../apps/api/src/seed.ts';
import { useDatabase } from './database';
import { clearMailbox, deliver } from './mailbox';

const WEB = join(import.meta.dirname, '../../apps/web/dist/shelfie/browser');

interface Stack {
  db: DatabaseSync;
  url: string;
}

// Each worker runs its own copy of the API over an in-memory database and serves the built web app
// from the same port, so tests never share state and never touch a database file.
export const test = base.extend<{ seeded: void; shelf: 'books' | 'empty' }, { stack: Stack }>({
  stack: [
    async ({}, use) => {
      const db = openDb(':memory:');
      const app = express();
      app.use(createApp(db, { log: () => {}, mail: deliver }));
      app.use(express.static(WEB));
      app.use((_req, res) => res.sendFile(join(WEB, 'index.html')));
      const server = app.listen(0);
      await new Promise((resolve) => server.once('listening', resolve));
      const url = `http://localhost:${(server.address() as AddressInfo).port}`;
      process.env.APP_URL = url; // Reset links point at this worker's app.
      useDatabase(db);
      await use({ db, url });
      server.closeAllConnections();
      server.close();
      db.close();
    },
    { scope: 'worker' },
  ],
  baseURL: async ({ stack }, use) => use(stack.url),
  shelf: ['books', { option: true }],
  // Every test starts from the seeded household: fresh PIN counters, no sessions, no mail.
  seeded: [
    async ({ stack, shelf }, use) => {
      seed(stack.db, { books: shelf !== 'empty' });
      clearMailbox();
      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
