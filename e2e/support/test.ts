import { test as base } from '@playwright/test';
import { execFileSync } from 'node:child_process';

// Every test starts from the seeded household: fresh PIN counters, no sessions.
export const test = base.extend<{ seeded: void; shelf: 'books' | 'empty' }>({
  shelf: ['books', { option: true }],
  seeded: [
    async ({ shelf }, use) => {
      const flags = shelf === 'empty' ? ['--no-books'] : [];
      execFileSync('node', ['../apps/api/src/seed.ts', ...flags], { env: { ...process.env, SHELFIE_DB: 'e2e.db' }, stdio: 'ignore' });
      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
