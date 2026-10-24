// Traces to: L2-160, L2-161, L2-162, L2-163, L2-164
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { healedDays, householdDay, healInDatabase, setHealingActivity, setReadingDays } from '../support/database';
import AxeBuilder from '@axe-core/playwright';
import { ReviewPage } from '../pages/review.page';
import { ShelfPage } from '../pages/shelf.page';
import { ShellPage } from '../pages/shell.page';
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

/** The weekday name of a household day, as the card and the toast say it. */
const weekday = (daysAgo: number) => new Date(`${householdDay(-daysAgo)}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' });

test('Given an activity and a day missed two days ago, when Dad heals it from Review, then the card goes, a toast gives the streak and the streak counts the day', async ({ page }) => {
  await setReadingDays([0, 1, 3, 4, 5, 6, 7]);
  await setHealingActivity(BROTHER);
  await signInAsDad(page);
  const review = new ReviewPage(page);
  await expect(review.healCard()).toContainText(`Nia didn’t log a chapter on ${weekday(2)}. If she did ${BROTHER}, heal it and her streak carries on.`);
  await expect(review.stat('Streak')).toContainText('2');

  await review.heal();
  await expect(review.toast(`${weekday(2)} healed`)).toBeVisible();
  await expect(review.toast('Nia’s streak is 8 days.')).toBeVisible();
  await expect(review.healCard()).toHaveCount(0);
  await expect(review.stat('Streak')).toContainText('8');
  expect(await healedDays()).toEqual([householdDay(-2)]);

  await page.reload();
  await expect(review.stat('Streak')).toContainText('8');
  await expect(review.healCard()).toHaveCount(0);
});

test('Given no activity, or this week’s heal already used, then Review shows no heal card', async ({ page }) => {
  await setReadingDays([0, 1, 3]);
  await signInAsDad(page);
  const review = new ReviewPage(page);
  await expect(review.stat('Streak')).toBeVisible();
  await expect(review.healCard()).toHaveCount(0);

  await setReadingDays([0, 1, 3, 4, 5, 6, 7]);
  await setHealingActivity(BROTHER);
  await healInDatabase(2, BROTHER);
  await page.reload();
  await expect(review.stat('Streak')).toContainText('8');
  await expect(review.stat('Streak')).toBeVisible();
  await expect(review.healCard()).toHaveCount(0);
});

test('Given the connection drops, when Dad chooses Heal it, then a toast says the day wasn’t healed and the card stays; trying again works', async ({ page }) => {
  await setReadingDays([0, 2]);
  await setHealingActivity(BROTHER);
  await signInAsDad(page);
  const review = new ReviewPage(page);
  await review.breakHealing();

  await review.heal();
  await expect(review.toast('The day wasn’t healed')).toBeVisible();
  await expect(review.healCard()).toBeVisible();

  await review.repairHealing();
  await review.heal();
  await expect(review.toast(`${weekday(1)} healed`)).toBeVisible();
  await expect(review.healCard()).toHaveCount(0);
});

test('Given a reader session, when it sends a heal, then the API answers 403 and nothing is healed', async ({ page }) => {
  await setReadingDays([0, 2]);
  await setHealingActivity(BROTHER);
  await signInAsNia(page);

  const response = await page.request.post('/api/streak-healing/heals', { headers: { 'X-Requested-With': 'Shelfie' }, data: { day: householdDay(-1) } });
  expect(response.status()).toBe(403);
  expect(await healedDays()).toEqual([]);
});

// A day earlier this week to heal: yesterday, or today itself on a Monday, which has no earlier day this week.
const HEALED = new Date().getUTCDay() === 1 ? 0 : 1;
const READ = [0, 1, 2, 3].filter((d) => d !== HEALED);

test('Given a day healed this week, when Nia opens her shelf, then the week strip joins it marked as healed, names the activity, and her streak counts it', async ({ page }) => {
  await setReadingDays(READ);
  await healInDatabase(HEALED, BROTHER);
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.weekStrip()).toHaveAccessibleName(new RegExp(`Healed ${weekday(HEALED)}: ${BROTHER}$`));
  await expect(shelf.healedNote()).toHaveText(`🩹 Healed ${weekday(HEALED)}: ${BROTHER}`);
  expect(await shelf.healedDayCount()).toBe(1);
  await expect(new ShellPage(page).streakBadge()).toHaveAccessibleName('4-day reading streak');
  await expect(shelf.summary()).toContainText('4-day streak');
});

test('Given a healed day on which a chapter is later logged, then the strip shows it as an ordinary read day', async ({ page }) => {
  await setReadingDays([0, 1, 2, 3]);
  await healInDatabase(HEALED, BROTHER);
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.weekStrip()).not.toHaveAccessibleName(/Healed/);
  expect(await shelf.healedDayCount()).toBe(0);
  await expect(shelf.healedNote()).toHaveCount(0);
  await expect(new ShellPage(page).streakBadge()).toHaveAccessibleName('4-day reading streak');
});

test('Given a phone, then the week strip with a healed day fits the screen and the shelf passes an axe scan', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await setReadingDays(READ);
  await healInDatabase(HEALED, BROTHER);
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.healedNote()).toBeVisible();
  expect(await shelf.scrollsSideways()).toBe(false);
  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
});
