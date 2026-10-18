// Traces to: L2-020
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { setReadingDays } from '../support/database';
import { ShellPage } from '../pages/shell.page';
import { ShelfPage } from '../pages/shelf.page';

test('Given chapters read on 5 days in a row ending today, when Nia opens her shelf, then her top bar and shelf show a 5-day streak', async ({ page }) => {
  await setReadingDays([0, 1, 2, 3, 4]);
  await signInAsNia(page);

  const shell = new ShellPage(page);
  await expect(shell.streakBadge()).toHaveAccessibleName('5-day reading streak');
  await expect(shell.streakBadge()).toContainText('5 days');
  await expect(new ShelfPage(page).summary()).toContainText('5-day streak');
});

test('Given nothing read today but four days up to yesterday, when Nia opens her shelf, then the streak is still 4', async ({ page }) => {
  await setReadingDays([1, 2, 3, 4]);
  await signInAsNia(page);

  await expect(new ShellPage(page).streakBadge()).toHaveAccessibleName('4-day reading streak');
});

test('Given nothing read today or yesterday, when Nia opens her shelf, then the streak is 0', async ({ page }) => {
  await setReadingDays([2, 3, 4]);
  await signInAsNia(page);

  await expect(new ShellPage(page).streakBadge()).toHaveAccessibleName('0-day reading streak');
  await expect(new ShellPage(page).streakBadge()).toContainText('0 days');
});
