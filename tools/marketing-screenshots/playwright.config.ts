import { defineConfig } from '@playwright/test';
import base from '../../e2e/playwright.config';

// Captures apps/marketing/assets/screenshots/*.png from the real app over the seeded household.
export default defineConfig({
  ...base,
  testDir: '.',
  globalSetup: '../../e2e/support/global-setup',
  testMatch: 'capture.spec.ts',
  outputDir: '../../.cache/marketing-screenshots',
  workers: 1,
  projects: [{ name: 'chromium', use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' } }],
});
