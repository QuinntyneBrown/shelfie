import { test as base } from '@playwright/test';
import { execFileSync } from 'node:child_process';

// Every test starts from the seeded household: fresh PIN counters, no sessions.
export const test = base.extend<{ seeded: void }>({
  seeded: [
    async ({}, use) => {
      execFileSync('node', ['../apps/api/src/seed.ts'], { env: { ...process.env, SHELFIE_DB: 'e2e.db' }, stdio: 'ignore' });
      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
