// Traces to: L2-112, L2-113
import { test, expect } from '../support/test';
import { signInAsDad } from '../support/signed-in';
import { addStreakReward } from '../support/database';
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
