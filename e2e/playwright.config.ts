import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://localhost:4200', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node support/mail-sink.mjs',
      url: 'http://localhost:8025/messages',
      reuseExistingServer: false,
    },
    {
      command:
        'rm -f e2e.db* && SHELFIE_DB=e2e.db node ../apps/api/src/seed.ts && SMTP_URL=smtp://localhost:1025 MAIL_FROM=shelfie@example.com APP_URL=http://localhost:4200 SHELFIE_DB=e2e.db node ../apps/api/src/main.ts',
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
