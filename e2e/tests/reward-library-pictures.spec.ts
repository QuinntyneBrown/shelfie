// Traces to: L2-111
import { test, expect } from '../support/test';
import { signInAsDad } from '../support/signed-in';
import { addGalleryReward } from '../support/database';
import { addRewardPictureViaApi } from '../support/reward-pictures';
import { SettingsPage } from '../pages/settings.page';
import { GalleryRewardDialog } from '../pages/gallery-reward-dialog.page';

test('Given the reward dialog, when Dad opens Choose one of ours, then Shelfie’s pictures are offered by name', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.addGalleryReward();
  const dialog = new GalleryRewardDialog(page);

  await dialog.openPictureLibrary();

  await expect(dialog.libraryPictures()).toHaveText([
    'Gift box', 'Cash', 'Gift card', 'Make-up', 'Jewellery', 'Theme park', 'Shopping', 'Swimming pool', 'Park', 'Party',
  ]);
});

test('Given a reward without pictures, when Dad chooses one of Shelfie’s pictures, then it is stored, featured and shows on its Settings row', async ({ page }) => {
  await addGalleryReward('Trip to the zoo', 3);
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.editGalleryReward('Trip to the zoo');
  const dialog = new GalleryRewardDialog(page);

  await dialog.chooseLibraryPicture('Theme park');

  await expect(dialog.pictureItems()).toHaveCount(1);
  await expect(dialog.featuredPicture()).toHaveCount(1);
  await expect(dialog.pictureImage(1)).toHaveAttribute('src', /^\/api\/gallery-rewards\//);
  const featured = await dialog.pictureImage(1).getAttribute('src');
  await expect(settings.galleryRewardPicture('Trip to the zoo')).toHaveAttribute('src', featured!);
});

test('Given Dad adds a reward, when he chooses one of Shelfie’s pictures before Add reward, then the reward is added with it', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.addGalleryReward();
  const dialog = new GalleryRewardDialog(page);
  await dialog.fill({ name: 'Pool party', target: '2' });

  await dialog.chooseLibraryPicture('Swimming pool');
  await dialog.save();

  await expect(dialog.dialog()).toHaveCount(0);
  await expect(settings.galleryRewardPicture('Pool party')).toHaveAttribute('src', /^\/api\/gallery-rewards\//);
});

test('Given a reward with 6 pictures, then Choose one of ours is off like Add a picture', async ({ page }) => {
  const id = await addGalleryReward('Trip to the zoo', 3);
  await signInAsDad(page);
  for (let i = 0; i < 6; i++) await addRewardPictureViaApi(page, id);
  const settings = new SettingsPage(page);
  await settings.open();

  await settings.editGalleryReward('Trip to the zoo');

  await expect(new GalleryRewardDialog(page).pictureLibraryButton()).toBeDisabled();
});
