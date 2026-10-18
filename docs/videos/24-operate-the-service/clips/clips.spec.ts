import { test } from '../../../../tools/video-record/test';

// Paced to the narration in script.md: the browser opens the API's health address and it answers ok.
test('operate-the-service-health', async ({ page }) => {
  await page.goto('/api/health');
  await page.waitForTimeout(6000);
  await page.reload();
  await page.waitForTimeout(5000);
});
