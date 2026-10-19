// Traces to: L2-100, L2-101, L2-102, L2-103, L2-104
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { addStreakReward, giveStreakRewardInDatabase, setReadingDays } from '../support/database';
import { SettingsPage } from '../pages/settings.page';
import { ReviewPage } from '../pages/review.page';
import { ShelfPage } from '../pages/shelf.page';
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

test('Given no streak reward is set, when Nia opens her shelf, then there is no Streak rewards section', async ({ page }) => {
  await setReadingDays([0, 1, 2, 3, 4]);
  await signInAsNia(page);

  await expect(new ShelfPage(page).group('On the go')).toBeVisible();
  await expect(new ShelfPage(page).streakRewards()).toHaveCount(0);
});

test('Given rewards for 7 and 30 days and a streak of 5, when Nia opens her shelf, then the 7-day reward is her goal with 5 of 7 days and the other just says what it takes', async ({ page }) => {
  await setReadingDays([0, 1, 2, 3, 4]);
  await addStreakReward(7, 'Ice cream');
  await addStreakReward(30, 'Pizza night');
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.streakReward('Ice cream')).toContainText('Your goal');
  await expect(shelf.streakReward('Ice cream')).toContainText('Read 7 days in a row');
  await expect(shelf.streakRewardProgress('Ice cream')).toHaveAccessibleName('5 of 7 days in a row');
  await expect(shelf.streakReward('Pizza night')).toContainText('Read 30 days in a row');
  await expect(shelf.streakRewardProgress('Pizza night')).toHaveCount(0);
  await expect(shelf.streakCelebration()).toHaveCount(0);
});

test('Given a streak of 7 and a 7-day reward, when Nia opens her shelf, then she celebrates and the reward is Ready!; it stays earned after the streak breaks', async ({ page }) => {
  await setReadingDays([0, 1, 2, 3, 4, 5, 6]);
  await addStreakReward(7, 'Ice cream');
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.streakCelebration()).toBeVisible();
  await expect(shelf.streakRewards()).toContainText('You read 7 days in a row. Dad is getting your Ice cream ready.');
  await expect(shelf.streakReward('Ice cream')).toContainText('Ready!');
  await expect(shelf.streakRewardProgress('Ice cream')).toHaveAccessibleName('7 of 7 days in a row');

  await setReadingDays([]);
  await page.reload();
  await expect(shelf.streakReward('Ice cream')).toContainText('Ready!');
});

test('Given the 7-day reward has been given, when Nia opens her shelf, then it says when, and the 30-day reward is her next goal', async ({ page }) => {
  await setReadingDays([0, 1, 2, 3, 4, 5, 6]);
  await addStreakReward(7, 'Ice cream');
  await giveStreakRewardInDatabase(7);
  await addStreakReward(30, 'Pizza night');
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.streakReward('Ice cream')).toContainText(/Given \w{3} \d+ \w{3}/);
  await expect(shelf.streakReward('Ice cream')).not.toContainText('Ready!');
  await expect(shelf.streakCelebration()).toHaveCount(0);
  await expect(shelf.streakReward('Pizza night')).toContainText('Your goal');
  await expect(shelf.streakRewardProgress('Pizza night')).toHaveAccessibleName('7 of 30 days in a row');
});

test('Given a phone, then the Streak rewards section stays within the screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await setReadingDays([0, 1, 2, 3, 4, 5, 6]);
  await addStreakReward(7, 'Ice cream with all the toppings she likes best');
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.streakRewards()).toBeVisible();
  expect(await shelf.scrollsSideways()).toBe(false);
  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
});

test('Given the 7-day reward is earned, when Dad opens Review, then a card names it and Give it gives it', async ({ page }) => {
  await setReadingDays([0, 1, 2, 3, 4, 5, 6]);
  await addStreakReward(7, 'Ice cream');
  await signInAsDad(page);
  const review = new ReviewPage(page);

  await expect(review.streakRewardCard(7)).toContainText('Her reward: Ice cream');
  await expect(review.summary()).toHaveText('2 chapters to read · 2 rewards to give');

  await review.giveStreakReward(7);
  await expect(review.toast('Ice cream given')).toBeVisible();
  await expect(review.streakRewardCard(7)).toHaveCount(0);
  await expect(review.summary()).toHaveText('2 chapters to read · 1 reward to give');
  const given = (await (await page.request.get('/api/streak-rewards')).json()) as { rewards: { milestone: number; givenOn: string | null }[] };
  expect(given.rewards[0]!.givenOn).not.toBeNull();
});

test('Given a streak reward that is set but not earned, when Dad opens Review, then there is no card for it', async ({ page }) => {
  await setReadingDays([0, 1, 2]);
  await addStreakReward(7, 'Ice cream');
  await signInAsDad(page);
  const review = new ReviewPage(page);

  await expect(review.summary()).toHaveText('2 chapters to read · 1 reward to give');
  await expect(review.streakRewardCard(7)).toHaveCount(0);
});

test('Given the connection drops, when Dad chooses Give it, then a toast says the reward wasn’t given and the card stays; trying again works', async ({ page }) => {
  await setReadingDays([0, 1, 2, 3, 4, 5, 6]);
  await addStreakReward(7, 'Ice cream');
  await signInAsDad(page);
  const review = new ReviewPage(page);
  await review.breakGiving();

  await review.giveStreakReward(7);
  await expect(review.toast('The reward wasn’t given')).toBeVisible();
  await expect(review.streakRewardCard(7)).toBeVisible();

  await review.repairGiving();
  await review.giveStreakReward(7);
  await expect(review.toast('Ice cream given')).toBeVisible();
  await expect(review.streakRewardCard(7)).toHaveCount(0);
});

test('Given a reader session, when it sends the request to give a streak reward, then the API answers 403 and nothing is given', async ({ page }) => {
  await setReadingDays([0, 1, 2, 3, 4, 5, 6]);
  await addStreakReward(7, 'Ice cream');
  await signInAsNia(page);

  const response = await page.request.post('/api/streak-rewards/7/give', { headers: { 'X-Requested-With': 'Shelfie' } });
  expect(response.status()).toBe(403);
});
