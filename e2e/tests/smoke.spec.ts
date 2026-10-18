// Traces to: L1-001
import { test, expect } from '../support/test';

test('Given the stack is running, when the app is opened, then it loads and the API is healthy', async ({ page, request }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Shelfie');
  expect((await request.get('/api/health')).ok()).toBe(true);
});
