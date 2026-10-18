// Traces to: L2-088, L2-089
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { addGalleryReward, finishBook, pickGoal } from '../support/database';
import { ReviewPage } from '../pages/review.page';
import { ShelfPage } from '../pages/shelf.page';

test.beforeEach(async () => {
  await pickGoal(await addGalleryReward('Trip to the zoo', 1));
  await addGalleryReward('New art set', 2);
  await finishBook('b-bfg');
});

test('Given Nia has finished the books her goal takes, when she opens her shelf, then it celebrates, shows Ready! and offers no other pick', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.goalCelebration()).toBeVisible();
  await expect(shelf.gallery()).toContainText('Dad is getting your Trip to the zoo ready.');
  await expect(shelf.galleryReward('Trip to the zoo')).toContainText('Ready!');
  await expect(shelf.goalProgress('Trip to the zoo')).toHaveAccessibleName('1 of 1 books finished');
  await expect(shelf.pickButtons()).toHaveCount(0);
});

test('Given reduced motion, when the goal is reached, then the celebration shows without confetti', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.goalCelebration()).toBeVisible();
  await expect(shelf.goalConfetti()).toHaveCount(0);
});

test('Given a reached goal, when Dad gives the reward from Review, then the dialog starts with the goal’s name and Nia’s goal is complete', async ({ page, browser, baseURL }) => {
  await signInAsDad(page);
  const review = new ReviewPage(page);

  await expect(review.goalLine('The BFG')).toHaveText('🎯 Nia reached her goal: Trip to the zoo');
  await expect(review.goalLine('Matilda')).toHaveCount(0);
  await review.openGiveReward('The BFG');
  await expect(review.rewardField()).toHaveValue('Trip to the zoo');
  await review.giveReward();
  await expect(page.getByRole('status').getByText('Reward given!')).toBeVisible();

  const herDevice = await browser.newContext({ baseURL });
  const nia = await herDevice.newPage();
  await signInAsNia(nia);
  const shelf = new ShelfPage(nia);
  await expect(shelf.finishedBook('The BFG')).toContainText('Trip to the zoo ·');
  await expect(shelf.goalCelebration()).toHaveCount(0);
  await expect(shelf.pickButtons()).toHaveCount(2);
  await herDevice.close();
});

test('Given a reached goal, when Dad opens Give a reward for another finished book, then the field starts empty as before', async ({ page }) => {
  await signInAsDad(page);
  const review = new ReviewPage(page);

  await review.openGiveReward('Matilda');

  await expect(review.rewardField()).toHaveValue('');
});
