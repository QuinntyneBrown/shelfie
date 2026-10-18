// Traces to: L2-094, L2-096
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { addGalleryReward } from '../support/database';
import { coverFixture } from '../support/covers';
import { SettingsPage } from '../pages/settings.page';
import { ShelfPage } from '../pages/shelf.page';
import { GalleryRewardDialog } from '../pages/gallery-reward-dialog.page';

test('Given a reward without pictures, when Dad adds one while editing it, then it is featured and shows on its Settings row and on Nia’s card', async ({ page }) => {
  await addGalleryReward('Trip to the zoo', 3);
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await expect(settings.galleryRewardPicture('Trip to the zoo')).toHaveCount(0);
  await settings.editGalleryReward('Trip to the zoo');
  const dialog = new GalleryRewardDialog(page);

  await dialog.choosePicture(coverFixture('lion-cover.jpg'));

  await expect(dialog.pictureItems()).toHaveCount(1);
  await expect(dialog.featuredPicture()).toHaveCount(1);
  await expect(dialog.pictureImage(1)).toHaveAccessibleName('Picture 1 of 1');
  const featured = await dialog.pictureImage(1).getAttribute('src');
  await expect(settings.galleryRewardPicture('Trip to the zoo')).toHaveAttribute('src', featured!);
  await page.context().clearCookies();
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await expect(shelf.galleryRewardPicture('Trip to the zoo')).toHaveAttribute('src', featured!);
  await expect.poll(() => shelf.galleryRewardPictureLoaded('Trip to the zoo')).toBe(true);
});
