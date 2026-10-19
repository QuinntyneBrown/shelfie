// Traces to: L2-094, L2-096
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { addGalleryReward } from '../support/database';
import { coverFixture } from '../support/covers';
import { addRewardPictureViaApi } from '../support/reward-pictures';
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

test('Given a reward with three pictures, when Dad removes the featured one, then the oldest one left is featured and the Settings row follows', async ({ page }) => {
  const id = await addGalleryReward('Trip to the zoo', 3);
  await signInAsDad(page);
  for (let i = 0; i < 3; i++) await addRewardPictureViaApi(page, id);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.editGalleryReward('Trip to the zoo');
  const dialog = new GalleryRewardDialog(page);
  await expect(dialog.pictureItems()).toHaveCount(3);
  const second = await dialog.pictureImage(2).getAttribute('src');

  await dialog.removePicture(1);

  await expect(dialog.pictureItems()).toHaveCount(2);
  await expect(dialog.picture(1)).toContainText('Featured');
  await expect(dialog.pictureImage(1)).toHaveAttribute('src', second!);
  await expect(dialog.pictureChooser()).toBeFocused();
  await expect(settings.galleryRewardPicture('Trip to the zoo')).toHaveAttribute('src', second!);
});

test('Given a reward with one picture, when Dad removes it, then the 🎁 comes back on its Settings row', async ({ page }) => {
  const id = await addGalleryReward('Trip to the zoo', 3);
  await signInAsDad(page);
  await addRewardPictureViaApi(page, id);
  const settings = new SettingsPage(page);
  await settings.open();
  await expect(settings.galleryRewardPicture('Trip to the zoo')).toHaveCount(1);
  await settings.editGalleryReward('Trip to the zoo');
  const dialog = new GalleryRewardDialog(page);

  await dialog.removePicture(1);

  await expect(dialog.pictureItems()).toHaveCount(0);
  await expect(settings.galleryRewardPicture('Trip to the zoo')).toHaveCount(0);
  await expect(settings.galleryReward('Trip to the zoo')).toContainText('🎁');
});

test('Given a reward with 6 pictures, when Dad edits it, then Add a picture is off and the help says why', async ({ page }) => {
  const id = await addGalleryReward('Trip to the zoo', 3);
  await signInAsDad(page);
  for (let i = 0; i < 6; i++) await addRewardPictureViaApi(page, id);
  const settings = new SettingsPage(page);
  await settings.open();

  await settings.editGalleryReward('Trip to the zoo');

  const dialog = new GalleryRewardDialog(page);
  await expect(dialog.pictureItems()).toHaveCount(6);
  await expect(dialog.pictureChooser()).toBeDisabled();
  await expect(dialog.pictureHelp()).toHaveText('That’s 6 pictures, the most a reward can have. Remove one to add another.');
});
