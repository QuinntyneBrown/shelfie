// Traces to: L2-086, L2-087
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { addGalleryReward, finishBook } from '../support/database';
import { ShelfPage } from '../pages/shelf.page';

test('Given no gallery rewards, when Nia opens her shelf, then Reading toward says there are none to pick yet', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.noRewardsYet()).toBeVisible();
  await expect(shelf.gallery()).toContainText('Ask Dad to add some rewards');
});

test('Given gallery rewards, when Nia picks one, then it is her goal at 0 and books she finishes afterwards count', async ({ page }) => {
  await addGalleryReward('Trip to the zoo', 3);
  await addGalleryReward('New art set', 2);
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await expect(shelf.galleryReward('Trip to the zoo')).toContainText('Finish 3 books');
  await expect(shelf.galleryReward('New art set')).toContainText('Finish 2 books');

  await shelf.pickGoal('Trip to the zoo');

  await expect(shelf.galleryReward('Trip to the zoo')).toContainText('Your goal');
  await expect(shelf.goalProgress('Trip to the zoo')).toHaveAccessibleName('0 of 3 books finished');
  await finishBook('b-bfg');
  await shelf.reload();
  await expect(shelf.goalProgress('Trip to the zoo')).toHaveAccessibleName('1 of 3 books finished');
  await expect(shelf.galleryReward('Trip to the zoo')).toContainText('2 more to go!');
});

test('Given a goal with progress, when Nia picks a different reward, then that one is her goal and starts again at 0', async ({ page }) => {
  await addGalleryReward('Trip to the zoo', 3);
  await addGalleryReward('New art set', 2);
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await shelf.pickGoal('Trip to the zoo');
  await expect(shelf.goalProgress('Trip to the zoo')).toBeVisible();
  await finishBook('b-bfg');

  await shelf.pickGoal('New art set');

  await expect(shelf.goalProgress('New art set')).toHaveAccessibleName('0 of 2 books finished');
  await expect(shelf.goalProgress('Trip to the zoo')).toHaveCount(0);
  await expect(shelf.galleryReward('Trip to the zoo').getByRole('button', { name: 'Pick Trip to the zoo' })).toBeVisible();
});

test('Given the gallery cannot be loaded, when Nia opens her shelf, then it says so with Try again and the rest of the shelf works', async ({ page }) => {
  await addGalleryReward('Trip to the zoo', 3);
  const shelf = new ShelfPage(page);
  await shelf.breakGalleryRequests();
  await signInAsNia(page);

  await expect(shelf.galleryLoadError()).toBeVisible();
  await expect(shelf.book('On the go', 'The Wild Robot')).toBeVisible();
  await shelf.repairGalleryRequests();
  await shelf.retryGallery();
  await expect(shelf.galleryReward('Trip to the zoo')).toBeVisible();
});

test('Given the server cannot be reached, when Nia picks a goal, then a toast says so and nothing is picked', async ({ page }) => {
  await addGalleryReward('Trip to the zoo', 3);
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await expect(shelf.galleryReward('Trip to the zoo')).toBeVisible();
  await shelf.breakGalleryRequests();

  await shelf.pickGoal('Trip to the zoo');

  await expect(shelf.toast('Your goal wasn’t picked')).toBeVisible();
  await expect(shelf.goalProgress('Trip to the zoo')).toHaveCount(0);
});
