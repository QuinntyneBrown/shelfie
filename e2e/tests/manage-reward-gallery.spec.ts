// Traces to: L2-081, L2-082, L2-083, L2-093
import { test, expect } from '../support/test';
import { signInAsDad } from '../support/signed-in';
import { addGalleryReward } from '../support/database';
import { SettingsPage } from '../pages/settings.page';
import { GalleryRewardDialog } from '../pages/gallery-reward-dialog.page';
import { RemoveGalleryRewardDialog } from '../pages/remove-gallery-reward-dialog.page';

test('Given no gallery rewards, when Dad adds Trip to the zoo for 3 books, then it is listed and a toast confirms it', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await expect(settings.noRewardsMessage()).toBeVisible();

  await settings.addGalleryReward();
  const dialog = new GalleryRewardDialog(page);
  await expect(dialog.heading()).toHaveText('Add a reward');
  await expect(dialog.nameField()).toBeFocused();
  await dialog.fill({ name: 'Trip to the zoo', target: '3' });
  await dialog.save();

  await expect(dialog.dialog()).toBeHidden();
  await expect(settings.toast('Trip to the zoo added')).toBeVisible();
  await expect(settings.galleryReward('Trip to the zoo')).toContainText('Finish 3 books');
  await expect(settings.noRewardsMessage()).toBeHidden();
});

test('Given a gallery reward, when Dad edits its name and books, then the list shows the new values', async ({ page }) => {
  await addGalleryReward('Trip to the zoo', 3);
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();

  await settings.editGalleryReward('Trip to the zoo');
  const dialog = new GalleryRewardDialog(page);
  await expect(dialog.heading()).toHaveText('Edit Trip to the zoo');
  await expect(dialog.nameField()).toHaveValue('Trip to the zoo');
  await expect(dialog.targetField()).toHaveValue('3');
  await dialog.fill({ name: 'Trip to the aquarium', target: '1' });
  await dialog.save();

  await expect(dialog.dialog()).toBeHidden();
  await expect(settings.toast('Trip to the aquarium saved')).toBeVisible();
  await expect(settings.galleryReward('Trip to the aquarium')).toContainText('Finish 1 book');
  await expect(settings.galleryReward('Trip to the zoo')).toHaveCount(0);
});

test('Given a gallery reward, when Dad removes it and confirms, then it leaves the list; focus starts on Keep it', async ({ page }) => {
  await addGalleryReward('Trip to the zoo', 3);
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();

  await settings.removeGalleryReward('Trip to the zoo');
  const dialog = new RemoveGalleryRewardDialog(page);
  await expect(dialog.heading()).toHaveText('Remove “Trip to the zoo”?');
  await expect(dialog.keepButton()).toBeFocused();
  await dialog.confirm();

  await expect(dialog.dialog()).toBeHidden();
  await expect(settings.toast('Trip to the zoo removed')).toBeVisible();
  await expect(settings.galleryReward('Trip to the zoo')).toHaveCount(0);
  await expect(settings.noRewardsMessage()).toBeVisible();
});

test('Given an empty name and 25 books, when Dad saves, then each field says what to fix and nothing is sent', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.addGalleryReward();
  const dialog = new GalleryRewardDialog(page);

  await dialog.fill({ name: '   ', target: '25' });
  await dialog.save();

  await expect(dialog.problemSummary()).toContainText('Fix 2 things');
  await expect(dialog.dialog()).toContainText('Name the reward.');
  await expect(dialog.dialog()).toContainText('Use a whole number from 1 to 20.');
  expect(dialog.requestCount()).toBe(0);
});

test('Given Dad adds a reward with a description, when he edits it, then the description is there to change, and clearing it saves no description', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.addGalleryReward();
  const dialog = new GalleryRewardDialog(page);
  await dialog.fill({ name: 'Trip to the zoo', description: 'We’ll see the penguins and have ice cream after.', target: '3' });
  await dialog.save();
  await expect(dialog.dialog()).toBeHidden();

  await settings.editGalleryReward('Trip to the zoo');
  await expect(dialog.descriptionField()).toHaveValue('We’ll see the penguins and have ice cream after.');
  await dialog.fill({ description: '   ' });
  await dialog.save();
  await expect(settings.toast('Trip to the zoo saved')).toBeVisible();

  await settings.editGalleryReward('Trip to the zoo');
  await expect(dialog.descriptionField()).toHaveValue('');
});

test('Given a description of 501 characters, when Dad saves, then it says to shorten it and nothing is sent', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.addGalleryReward();
  const dialog = new GalleryRewardDialog(page);

  await dialog.fill({ name: 'Trip to the zoo', description: ` ${'x'.repeat(501)} `, target: '3' });
  await dialog.save();

  await expect(dialog.problemSummary()).toContainText('Fix 1 thing');
  await expect(dialog.problemSummary()).toContainText('Shorten the description');
  await expect(dialog.dialog()).toContainText('Use 500 characters or fewer.');
  expect(dialog.requestCount()).toBe(0);
});

test('Given the server cannot be reached, when Dad saves a reward, then the dialog says it wasn’t saved, keeps the values and Try again saves', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.addGalleryReward();
  const dialog = new GalleryRewardDialog(page);
  await dialog.fill({ name: 'Trip to the zoo', target: '3' });
  await dialog.breakSaving();

  await dialog.save();

  await expect(dialog.failure()).toContainText('Trip to the zoo wasn’t saved');
  await expect(dialog.nameField()).toHaveValue('Trip to the zoo');
  await expect(dialog.targetField()).toHaveValue('3');
  await dialog.repairSaving();
  await dialog.tryAgain();
  await expect(dialog.dialog()).toBeHidden();
  await expect(settings.galleryReward('Trip to the zoo')).toBeVisible();
});

test('Given the server cannot be reached, when Dad removes a reward, then the dialog stays open and the reward stays', async ({ page }) => {
  await addGalleryReward('Trip to the zoo', 3);
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.removeGalleryReward('Trip to the zoo');
  const dialog = new RemoveGalleryRewardDialog(page);
  await dialog.breakRemoving();

  await dialog.confirm();

  await expect(dialog.failure()).toBeVisible();
  await expect(settings.galleryReward('Trip to the zoo')).toHaveCount(1);
});

test('Given a phone, when Dad opens Settings with rewards, then the page does not scroll sideways', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await addGalleryReward('A very long reward name that keeps going for quite a while to test wrapping', 20);
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();

  await expect(settings.galleryReward('A very long reward name')).toBeVisible();
  expect(await settings.scrollsSideways()).toBe(false);
});
