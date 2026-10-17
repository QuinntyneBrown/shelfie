import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://localhost:4200', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'rm -f e2e.db* && SHELFIE_DB=e2e.db node ../apps/api/src/seed.ts && SHELFIE_DB=e2e.db node ../apps/api/src/main.ts',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: false,
    },
    {
      command: 'npm run start -w web -- --port 4200',
      cwd: '..',
      url: 'http://localhost:4200',
      reuseExistingServer: false,
    },
  ],
});
