import { defineConfig, devices } from '@playwright/test';
import base from '../../e2e/playwright.config';

// Records the clips in docs/videos/*/clips/clips.spec.ts against the real app, one video file per clip.
export default defineConfig({
  ...base,
  testDir: '../../docs/videos',
  testMatch: '**/clips/clips.spec.ts',
  outputDir: '../../.cache/clips',
  timeout: 120_000,
  use: {
    ...base.use,
    ...devices['Desktop Chrome'],
    viewport: { width: 1408, height: 792 },
    video: { mode: 'on', size: { width: 1408, height: 792 } },
    launchOptions: { slowMo: 350 },
  },
  projects: [{ name: 'chromium', use: { viewport: { width: 1408, height: 792 } } }],
  webServer: (base.webServer as Array<{ cwd?: string }>).map((server) => ({ cwd: '../../e2e', ...server })),
});
