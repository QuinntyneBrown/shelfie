// Traces to: L2-160, L2-161, L2-162, L2-163, L2-164
import { test, expect } from '../support/test';
import { signInAsDad } from '../support/signed-in';
import { setHealingActivity } from '../support/database';
import { SettingsPage } from '../pages/settings.page';
import { HealingActivityDialog } from '../pages/healing-activity-dialog.page';

const BROTHER = '10 minutes reading with your brother';

test('Given no healing activity, when Dad sets one, then the row shows it and a toast confirms it', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await expect(settings.streakHealing()).toContainText('No activity set');
  await expect(settings.streakHealing()).toContainText('Healing is off');

  await settings.setHealingActivity();
  const dialog = new HealingActivityDialog(page);
  await expect(dialog.heading()).toHaveText('Set a healing activity');
  await expect(dialog.nameField()).toBeFocused();
  await dialog.fill(BROTHER);
  await dialog.save();

  await expect(dialog.dialog()).toBeHidden();
  await expect(settings.toast('Healing activity set')).toBeVisible();
  await expect(settings.streakHealing()).toContainText(BROTHER);
  await expect(settings.streakHealing()).toContainText('Heal one missed day a week from Review');
});

test('Given an empty name, when Dad saves, then the field says so and nothing is sent; the field stops at 100 characters', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.setHealingActivity();
  const dialog = new HealingActivityDialog(page);

  await dialog.fill('   ');
  await dialog.save();
  await expect(dialog.nameField()).toHaveAccessibleDescription(/Name the activity\./);
  expect(dialog.requestCount()).toBe(0);

  await dialog.fill('x'.repeat(101));
  expect(await dialog.nameField().inputValue()).toHaveLength(100);
});

test('Given a healing activity, when Dad edits it and then removes it, then the row follows and toasts confirm both', async ({ page }) => {
  await setHealingActivity(BROTHER);
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();

  await settings.editHealingActivity(BROTHER);
  const dialog = new HealingActivityDialog(page);
  await expect(dialog.heading()).toHaveText('Edit the healing activity');
  await expect(dialog.nameField()).toHaveValue(BROTHER);
  await dialog.fill('Read a comic with Mum');
  await dialog.save();
  await expect(settings.toast('Healing activity saved')).toBeVisible();
  await expect(settings.streakHealing()).toContainText('Read a comic with Mum');

  await settings.removeHealingActivity('Read a comic with Mum');
  await expect(settings.toast('Healing activity removed')).toBeVisible();
  await expect(settings.streakHealing()).toContainText('No activity set');
});

test('Given the connection drops, when Dad saves or removes, then nothing changes, the name is kept and Try again works', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.setHealingActivity();
  const dialog = new HealingActivityDialog(page);
  await dialog.breakSaving();

  await dialog.fill(BROTHER);
  await dialog.save();
  await expect(dialog.failure()).toContainText(`${BROTHER} wasn’t saved`);
  await expect(dialog.nameField()).toHaveValue(BROTHER);

  await dialog.repairSaving();
  await dialog.tryAgain();
  await expect(dialog.dialog()).toBeHidden();
  await expect(settings.streakHealing()).toContainText(BROTHER);

  await settings.breakRemovingHealing();
  await settings.removeHealingActivity(BROTHER);
  await expect(settings.toast('The healing activity wasn’t removed')).toBeVisible();
  await expect(settings.streakHealing()).toContainText(BROTHER);
});

test('Given a phone, then the healing dialog is a bottom sheet and the Streak healing card stays within the screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await setHealingActivity('Twenty minutes of reading aloud to Grandma on the phone, with the funny voices');
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await expect(settings.streakHealing()).toBeVisible();
  expect(await settings.scrollsSideways()).toBe(false);

  await settings.editHealingActivity('Twenty minutes of reading aloud to Grandma on the phone, with the funny voices');
  const box = await new HealingActivityDialog(page).dialog().boundingBox();
  expect(box!.width).toBeLessThanOrEqual(360);
});
