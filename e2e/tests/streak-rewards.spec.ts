// Traces to: L2-100, L2-101, L2-102, L2-103, L2-104
import { test, expect } from '../support/test';
import { signInAsDad } from '../support/signed-in';
import { addStreakReward, giveStreakRewardInDatabase } from '../support/database';
import { SettingsPage } from '../pages/settings.page';
import { StreakRewardDialog } from '../pages/streak-reward-dialog.page';

test('Given no streak rewards, when Dad sets Ice cream for 7 days, then the row shows it and a toast confirms it', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  for (const days of [7, 30, 100]) {
    await expect(settings.streakReward(days)).toContainText('No reward set');
  }

  await settings.setStreakReward(7);
  const dialog = new StreakRewardDialog(page);
  await expect(dialog.heading()).toHaveText('Set a 7-day reward');
  await expect(dialog.nameField()).toBeFocused();
  await dialog.fill('Ice cream');
  await dialog.save();

  await expect(dialog.dialog()).toBeHidden();
  await expect(settings.toast('Ice cream set for 7 days')).toBeVisible();
  await expect(settings.streakReward(7)).toContainText('7 days in a row · Ice cream');
  await expect(settings.streakReward(30)).toContainText('No reward set');
});

test('Given an empty name, when Dad saves, then the field says so and nothing is sent; the field stops at 100 characters', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.setStreakReward(7);
  const dialog = new StreakRewardDialog(page);

  await dialog.save();
  await expect(dialog.dialog()).toContainText('Name the reward.');
  await expect(dialog.nameField()).toHaveAccessibleDescription(/Name the reward\./);

  expect(dialog.requestCount()).toBe(0);

  await dialog.fill('x'.repeat(101));
  expect(await dialog.nameField().inputValue()).toHaveLength(100);
});

test('Given a streak reward, when Dad edits it and then removes it, then the row follows and toasts confirm both', async ({ page }) => {
  await addStreakReward(7, 'Ice cream');
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await expect(settings.streakReward(7)).toContainText('Nia gets it when she reaches 7 days');

  await settings.editStreakReward('Ice cream');
  const dialog = new StreakRewardDialog(page);
  await expect(dialog.heading()).toHaveText('Edit the 7-day reward');
  await expect(dialog.nameField()).toHaveValue('Ice cream');
  await dialog.fill('Sundae');
  await dialog.save();
  await expect(settings.toast('Sundae saved')).toBeVisible();
  await expect(settings.streakReward(7)).toContainText('7 days in a row · Sundae');

  await settings.removeStreakReward('Sundae');
  await expect(settings.toast('Sundae removed')).toBeVisible();
  await expect(settings.streakReward(7)).toContainText('No reward set');
});

test('Given a streak reward that has been given, then its row shows the day and offers no Edit or Remove', async ({ page }) => {
  await addStreakReward(7, 'Ice cream');
  await giveStreakRewardInDatabase(7);
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();

  await expect(settings.streakReward(7)).toContainText(/Given \w{3} \d+ \w{3}/);
  await expect(settings.streakReward(7).getByRole('button')).toHaveCount(0);
});

test('Given the connection drops, when Dad saves, then the dialog says the reward wasn’t saved, keeps the name, and Try again works', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.setStreakReward(30);
  const dialog = new StreakRewardDialog(page);
  await dialog.breakSaving();

  await dialog.fill('Pizza night');
  await dialog.save();
  await expect(dialog.failure()).toContainText('Pizza night wasn’t saved');
  await expect(dialog.nameField()).toHaveValue('Pizza night');

  await dialog.repairSaving();
  await dialog.tryAgain();
  await expect(dialog.dialog()).toBeHidden();
  await expect(settings.streakReward(30)).toContainText('30 days in a row · Pizza night');
});

test('Given a phone, then the dialog is a bottom sheet and the Streak rewards rows stay within the screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.setStreakReward(7);

  const dialog = new StreakRewardDialog(page);
  const box = await dialog.dialog().boundingBox();
  expect(box!.width).toBeLessThanOrEqual(360);
  expect(await settings.scrollsSideways()).toBe(false);
});
