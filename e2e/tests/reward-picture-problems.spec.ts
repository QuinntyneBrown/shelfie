// Traces to: L2-101, L2-103, L2-104, L2-105
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { addGalleryReward } from '../support/database';
import { coverFixture } from '../support/covers';
import { addRewardPictureViaApi, breakRewardPictureImages } from '../support/reward-pictures';
import { SettingsPage } from '../pages/settings.page';
import { ShelfPage } from '../pages/shelf.page';
import { GalleryRewardDialog } from '../pages/gallery-reward-dialog.page';

async function editZooReward(page: Parameters<typeof signInAsDad>[0], pictures = 0) {
  const id = await addGalleryReward('Trip to the zoo', 3, 'We’ll see the penguins.');
  await signInAsDad(page);
  for (let i = 0; i < pictures; i++) await addRewardPictureViaApi(page, id);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.editGalleryReward('Trip to the zoo');
  return { settings, dialog: new GalleryRewardDialog(page) };
}

test('Given a picture uploading, then its thumbnail is busy, the help says so and Add a picture is off until it ends', async ({ page }) => {
  const { dialog } = await editZooReward(page, 1);
  const release = dialog.holdUploads();

  await dialog.choosePicture(coverFixture('lion-cover.jpg'));

  await expect(dialog.picture(2)).toContainText('Uploading…');
  await expect(dialog.pictureHelp()).toHaveText('Uploading the picture…');
  await expect(dialog.pictureChooser()).toBeDisabled();
  await release();
  await expect(dialog.picture(2)).not.toContainText('Uploading…');
  await expect(dialog.pictureChooser()).toBeEnabled();
});

test('Given the upload cannot reach the server, then that picture says it didn’t upload, everything else stays, and Try again stores it', async ({ page }) => {
  const { settings, dialog } = await editZooReward(page, 1);
  await dialog.fill({ name: 'Trip to the big zoo' });
  await dialog.breakPictureChanges();

  await dialog.choosePicture(coverFixture('lion-cover.jpg'));

  await expect(dialog.picture(2)).toContainText('Didn’t upload.');
  await expect(dialog.pictureItems()).toHaveCount(2);
  await expect(dialog.nameField()).toHaveValue('Trip to the big zoo');
  await expect(dialog.descriptionField()).toHaveValue('We’ll see the penguins.');
  await dialog.repairPictureChanges();
  await dialog.retryPicture(2);
  await expect(dialog.picture(2)).not.toContainText('Didn’t upload.');
  await expect(dialog.picture(2)).toContainText('Make featured');
  await dialog.save();
  await expect(settings.toast('Trip to the big zoo saved')).toBeVisible();
});

test('Given a file that is not a picture or is over 5 MB, then the list says why and nothing is sent', async ({ page }) => {
  const { dialog } = await editZooReward(page);

  await dialog.chooseNotAPicture();
  await expect(dialog.pictureError()).toHaveText('Shelfie can’t use that file. Pick a JPEG, PNG or WebP photo.');
  await dialog.chooseTooLargePicture();
  await expect(dialog.pictureError()).toHaveText('That photo is too big. Pick one under 5 MB.');

  await expect(dialog.pictureItems()).toHaveCount(0);
  expect(dialog.requestCount()).toBe(0);
});

test('Given a file only the server can tell is not a picture, then the server’s refusal shows in the same words and no thumbnail stays', async ({ page }) => {
  const { dialog } = await editZooReward(page);

  await dialog.chooseBrokenJpeg();

  await expect(dialog.pictureError()).toHaveText('Shelfie can’t use that file. Pick a JPEG, PNG or WebP photo.');
  await expect(dialog.pictureItems()).toHaveCount(0);
});

test('Given removing or featuring a picture cannot reach the server, then a toast says so and the pictures stay', async ({ page }) => {
  const { settings, dialog } = await editZooReward(page, 2);
  await dialog.breakPictureChanges();

  await dialog.makeFeatured(2);
  await expect(settings.toast('The picture wasn’t changed')).toBeVisible();
  await dialog.removePicture(1);

  await expect(dialog.pictureItems()).toHaveCount(2);
  await expect(dialog.featuredPictureImage()).toHaveAccessibleName('Picture 1 of 2');
});

test('Given Dad chooses two pictures while adding a reward and makes the second featured, then they upload after the reward and the second is featured', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.addGalleryReward();
  const dialog = new GalleryRewardDialog(page);
  await dialog.fill({ name: 'Trip to the zoo', target: '3' });

  await dialog.choosePicture(coverFixture('cover.jpg'));
  await dialog.choosePicture(coverFixture('lion-cover.jpg'));
  await expect(dialog.pictureItems()).toHaveCount(2);
  await expect(dialog.featuredPictureImage()).toHaveAccessibleName('Picture 1 of 2');
  expect(dialog.requestCount()).toBe(0);
  await dialog.makeFeatured(2);
  await dialog.save();

  await expect(settings.toast('Trip to the zoo added')).toBeVisible();
  await settings.editGalleryReward('Trip to the zoo');
  await expect(dialog.pictureItems()).toHaveCount(2);
  await expect(dialog.featuredPictureImage()).toHaveAccessibleName('Picture 2 of 2');
  await expect(settings.galleryRewardPicture('Trip to the zoo')).toHaveAttribute('src', (await dialog.pictureImage(2).getAttribute('src'))!);
});

test('Given a featured picture that fails to load, when Nia opens her shelf, then the 🎁 shows instead of a broken image', async ({ page }) => {
  const id = await addGalleryReward('Trip to the zoo', 3);
  await signInAsDad(page);
  await addRewardPictureViaApi(page, id);
  await page.context().clearCookies();
  await breakRewardPictureImages(page);

  await signInAsNia(page);

  const shelf = new ShelfPage(page);
  await expect(shelf.galleryReward('Trip to the zoo')).toBeVisible();
  await expect(shelf.galleryRewardPicture('Trip to the zoo')).toHaveCount(0);
  await expect(shelf.galleryRewardGift('Trip to the zoo')).toBeVisible();
});

test('Given a phone, when Dad edits a reward with 6 pictures, then the bottom sheet stays within the screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const { dialog } = await editZooReward(page, 6);

  await expect(dialog.pictureItems()).toHaveCount(6);
  expect(await dialog.overflowsScreen()).toBe(false);
});

test('Given a long description on a phone, when Nia opens her shelf, then the card wraps it and nothing scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await addGalleryReward('Trip to the zoo', 3, 'Penguins'.repeat(40));
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.galleryRewardDescription('Trip to the zoo')).toBeVisible();
  expect(await shelf.scrollsSideways()).toBe(false);
});

test('Given a picture fails after a new reward is saved, then the reward stays added and the dialog goes on as its edit dialog with Try again', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.addGalleryReward();
  const dialog = new GalleryRewardDialog(page);
  await dialog.fill({ name: 'Trip to the zoo', target: '3' });
  await dialog.choosePicture(coverFixture('cover.jpg'));
  await dialog.breakPictureChanges();

  await dialog.save();

  await expect(dialog.heading()).toHaveText('Edit Trip to the zoo');
  await expect(dialog.picture(1)).toContainText('Didn’t upload.');
  await expect(settings.galleryReward('Trip to the zoo')).toContainText('Finish 3 books');
  await dialog.repairPictureChanges();
  await dialog.retryPicture(1);
  await expect(dialog.featuredPicture()).toHaveCount(1);
  await expect(settings.galleryRewardPicture('Trip to the zoo')).toHaveCount(1);
});
