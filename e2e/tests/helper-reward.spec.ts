// Traces to: L2-141, L2-145
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { addZoe } from '../support/database';
import { SettingsPage } from '../pages/settings.page';
import { HelperRewardDialog } from '../pages/helper-reward-dialog.page';

test('Given two readers and no helper reward, when Dad sets Cinema trip at 120 minutes, then the row shows it and a toast confirms it', async ({ page }) => {
  await addZoe();
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await expect(settings.helperRewardRow()).toContainText('No helper reward set');

  await settings.setHelperReward();
  const dialog = new HelperRewardDialog(page);
  await expect(dialog.heading()).toHaveText('Set the helper reward');
  await expect(dialog.nameField()).toBeFocused();
  await dialog.fill('Cinema trip', '120');
  await dialog.save();

  await expect(dialog.dialog()).toBeHidden();
  await expect(settings.toast('Cinema trip set')).toBeVisible();
  await expect(settings.helperRewardRow()).toContainText('Cinema trip · 120 minutes');
});

test('Given an empty name and 20 minutes, when Dad saves, then each field says what is wrong and nothing is sent', async ({ page }) => {
  await addZoe();
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.setHelperReward();
  const dialog = new HelperRewardDialog(page);

  await dialog.fill('', '20');
  await dialog.save();

  await expect(dialog.nameField()).toHaveAccessibleDescription(/Name the reward\./);
  await expect(dialog.minutesField()).toHaveAccessibleDescription(/Use 30 to 600 minutes\./);
  expect(dialog.requestCount()).toBe(0);
});

test('Given a helper reward, when Dad edits it, then the dialog shows it and the change is saved', async ({ page }) => {
  await addZoe();
  await signInAsDad(page);
  await page.request.put('/api/helper-reward', { headers: { 'X-Requested-With': 'Shelfie' }, data: { name: 'Cinema trip', targetMinutes: 120 } });
  const settings = new SettingsPage(page);
  await settings.open();

  await settings.editHelperReward('Cinema trip');
  const dialog = new HelperRewardDialog(page);
  await expect(dialog.heading()).toHaveText('Edit the helper reward');
  await expect(dialog.nameField()).toHaveValue('Cinema trip');
  await expect(dialog.minutesField()).toHaveValue('120');
  await dialog.fill('Bowling', '150');
  await dialog.save();

  await expect(settings.toast('Bowling saved')).toBeVisible();
  await expect(settings.helperRewardRow()).toContainText('Bowling · 150 minutes');
});

test('Given the connection drops, when Dad saves, then the dialog says it wasn’t saved, keeps the values, and Try again works', async ({ page }) => {
  await addZoe();
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.setHelperReward();
  const dialog = new HelperRewardDialog(page);
  await dialog.breakSaving();

  await dialog.fill('Cinema trip', '120');
  await dialog.save();
  await expect(dialog.failure()).toContainText('Cinema trip wasn’t saved');
  await expect(dialog.minutesField()).toHaveValue('120');

  await dialog.repairSaving();
  await dialog.tryAgain();
  await expect(dialog.dialog()).toBeHidden();
  await expect(settings.helperRewardRow()).toContainText('Cinema trip · 120 minutes');
});

test('Given a household with one reader, then Settings has no Helper reward section', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();

  await expect(settings.heading()).toHaveText('Settings');
  await expect(settings.streakRewards()).toBeVisible();
  await expect(settings.helperReward()).toHaveCount(0);
});

test('Given a reader session, when it sets the helper reward, then the API answers 403', async ({ page }) => {
  await addZoe();
  await signInAsNia(page);

  const response = await page.request.put('/api/helper-reward', { headers: { 'X-Requested-With': 'Shelfie' }, data: { name: 'Sweets', targetMinutes: 30 } });
  expect(response.status()).toBe(403);
});
