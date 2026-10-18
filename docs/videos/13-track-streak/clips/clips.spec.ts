import { test } from '../../../../tools/video-record/test';
import { signInAsNia } from '../../../../e2e/support/signed-in';
import { setReadingDays } from '../../../../e2e/support/database';
import { ShellPage } from '../../../../e2e/pages/shell.page';
import { ShelfPage } from '../../../../e2e/pages/shelf.page';

// Paced to the narration in script.md: five days in a row, shown in the top bar and on the shelf.
test('five-day-streak', async ({ page }) => {
  setReadingDays([0, 1, 2, 3, 4]);
  await signInAsNia(page);
  await page.waitForTimeout(1500);
  await new ShellPage(page).streakBadge().hover();
  await page.waitForTimeout(8000);
  await new ShelfPage(page).summary().hover();
  await page.waitForTimeout(12000);
});

// Paced to the narration: last read two days ago, so the streak is back to zero.
test('streak-back-to-zero', async ({ page }) => {
  setReadingDays([2, 3, 4]);
  await signInAsNia(page);
  await page.waitForTimeout(1500);
  await new ShellPage(page).streakBadge().hover();
  await page.waitForTimeout(8000);
});
