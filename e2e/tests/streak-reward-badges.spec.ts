// Traces to: L2-112, L2-113
import { test, expect } from '../support/test';
import AxeBuilder from '@axe-core/playwright';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { addStreakReward, setReadingDays } from '../support/database';
import { ShelfPage } from '../pages/shelf.page';
import { SettingsPage } from '../pages/settings.page';
import { StreakRewardDialog } from '../pages/streak-reward-dialog.page';

test('Given no streak rewards, when Dad sets Pocket money worth $20 for 7 days, then the row shows the amount, and editing it to $25 sticks', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();

  await settings.setStreakReward(7);
  const dialog = new StreakRewardDialog(page);
  await expect(dialog.amountField()).toHaveAccessibleDescription(/Leave it empty for a reward that isn’t money\./);
  await dialog.fill('Pocket money');
  await dialog.fillAmount('20');
  await dialog.save();

  await expect(settings.streakReward(7)).toContainText('7 days in a row · Pocket money · $20');

  await settings.editStreakReward('Pocket money');
  await expect(dialog.amountField()).toHaveValue('20');
  await dialog.fillAmount('25');
  await dialog.save();
  await expect(settings.streakReward(7)).toContainText('7 days in a row · Pocket money · $25');
});

test('Given a reward with an amount, when Dad clears the amount, then the row shows only the name', async ({ page }) => {
  await addStreakReward(7, 'Pocket money', 20);
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();

  await settings.editStreakReward('Pocket money');
  const dialog = new StreakRewardDialog(page);
  await dialog.fillAmount('');
  await dialog.save();

  await expect(settings.streakReward(7)).toContainText('7 days in a row · Pocket money');
  await expect(settings.streakReward(7)).not.toContainText('$');
});

test('Given an amount that is not whole dollars from 1 to 1000, when Dad saves, then the field says so and nothing is sent', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.setStreakReward(7);
  const dialog = new StreakRewardDialog(page);
  await dialog.fill('Pocket money');

  for (const amount of ['2.5', '0', '1001']) {
    await dialog.fillAmount(amount);
    await dialog.save();
    await expect(dialog.amountField()).toHaveAccessibleDescription(/Enter whole dollars from 1 to 1000\./);
  }
  expect(dialog.requestCount()).toBe(0);
});

test('Given a 7-day reward worth $20 and a streak of 1, when Nia opens her shelf, then its badge and path of days show what she earns and where she is', async ({ page }) => {
  await setReadingDays([0]);
  await addStreakReward(7, 'Pocket money', 20);
  await addStreakReward(30, 'Pizza night');
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.streakRewardBadge('Pocket money')).toHaveAccessibleName('7-day badge, $20');
  await expect(shelf.streakReward('Pocket money')).toContainText('Read 7 days in a row to earn $20');
  await expect(shelf.streakRewardProgress('Pocket money')).toHaveAccessibleName('1 of 7 days in a row');
  await expect(shelf.streakRewardDaysRead('Pocket money')).toHaveText(['1']);
  await expect(shelf.streakRewardNextDay('Pocket money')).toHaveText('2');
  await expect(shelf.streakRewardBadge('Pizza night')).toHaveAccessibleName('30-day badge');
  await expect(shelf.streakReward('Pizza night')).toContainText('Read 30 days in a row');
  await expect(shelf.streakReward('Pizza night')).not.toContainText('to earn');
});

test('Given a 30-day reward is her goal, when Nia opens her shelf, then it shows the bar with its badge, not a path of days', async ({ page }) => {
  await setReadingDays([0, 1, 2]);
  await addStreakReward(30, 'Pizza night', 50);
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.streakRewardBadge('Pizza night')).toHaveAccessibleName('30-day badge, $50');
  await expect(shelf.streakRewardProgress('Pizza night')).toHaveAccessibleName('3 of 30 days in a row');
  await expect(shelf.streakRewardDaysRead('Pizza night')).toHaveCount(0);
});

test('Given a streak of 7 and a 7-day reward worth $20, when Nia opens her shelf, then the celebration shows the badge and names the $20, and every day is read', async ({ page }) => {
  await setReadingDays([0, 1, 2, 3, 4, 5, 6]);
  await addStreakReward(7, 'Pocket money', 20);
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.streakRewards()).toContainText('You read 7 days in a row. Dad is getting your $20 ready.');
  await expect(shelf.streakRewards().getByRole('img', { name: '7-day badge, $20' })).toHaveCount(2);
  await expect(shelf.streakRewardDaysRead('Pocket money')).toHaveCount(7);
});

test('Given a phone, then the badges and path of days stay within the screen and pass an accessibility scan', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await setReadingDays([0, 1]);
  await addStreakReward(7, 'Pocket money for the weekend trip to the fair', 1000);
  await addStreakReward(100, 'A new bike', 500);
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.streakRewardBadge('A new bike')).toBeVisible();
  expect(await shelf.scrollsSideways()).toBe(false);
  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
});
