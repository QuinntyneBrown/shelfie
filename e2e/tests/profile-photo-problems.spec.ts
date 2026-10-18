// Traces to: L2-042, L2-044
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { ShellPage } from '../pages/shell.page';
import { ProfilePhotoDialog, fixture } from '../pages/profile-photo-dialog.page';

test('Given Nia picks a file that is not a photo, then she is told to pick a JPEG, PNG or WebP and nothing is sent', async ({ page }) => {
  await signInAsNia(page);
  const shell = new ShellPage(page);
  const dialog = new ProfilePhotoDialog(page);
  dialog.watchUploads();
  await shell.openMyPhoto('Nia');

  await dialog.chooseNotAPhoto();

  await expect(dialog.problem()).toHaveText('Shelfie can’t use that file. Pick a JPEG, PNG or WebP photo.');
  expect(dialog.uploadCount()).toBe(0);
  await expect(shell.accountPhoto('Nia')).toHaveCount(0);
});

test('Given Nia picks a photo over 5 MB, then she is told to pick a smaller one and nothing is sent', async ({ page }) => {
  await signInAsNia(page);
  const dialog = new ProfilePhotoDialog(page);
  dialog.watchUploads();
  await new ShellPage(page).openMyPhoto('Nia');

  await dialog.chooseTooLarge();

  await expect(dialog.problem()).toHaveText('That photo is too big. Pick one under 5 MB.');
  expect(dialog.uploadCount()).toBe(0);
});

test('Given a file that only claims to be a JPEG, when Nia picks it, then Shelfie refuses it with the same message and her initial stays', async ({ page }) => {
  await signInAsNia(page);
  const shell = new ShellPage(page);
  const dialog = new ProfilePhotoDialog(page);
  dialog.watchUploads();
  await shell.openMyPhoto('Nia');

  await dialog.chooseBrokenJpeg();

  await expect(dialog.problem()).toHaveText('Shelfie can’t use that file. Pick a JPEG, PNG or WebP photo.');
  expect(dialog.uploadCount()).toBe(1);
  await expect(shell.accountPhoto('Nia')).toHaveCount(0);
});

test('Given Shelfie cannot be reached, when Nia picks a photo, then she can try again once it is back', async ({ page }) => {
  await signInAsNia(page);
  const shell = new ShellPage(page);
  const dialog = new ProfilePhotoDialog(page);
  await shell.openMyPhoto('Nia');
  await dialog.breakUploads();

  await dialog.choose(fixture('nia.jpg'));

  await expect(dialog.problem()).toContainText('Your photo didn’t upload');
  await expect(shell.accountPhoto('Nia')).toHaveCount(0);
  await dialog.repairUploads();
  await dialog.tryAgain();
  await expect(dialog.success()).toContainText('Looking great, Nia!');
  await expect(dialog.problem()).toHaveCount(0);
});

test('Given a photo is uploading, then the choose button is busy and Done waits until it is in', async ({ page }) => {
  await signInAsNia(page);
  const dialog = new ProfilePhotoDialog(page);
  await new ShellPage(page).openMyPhoto('Nia');
  const release = await dialog.holdUploads();

  await dialog.choose(fixture('nia.jpg'));

  await expect(dialog.chooseButton()).toHaveAttribute('aria-busy', 'true');
  await expect(dialog.doneButton()).toBeDisabled();
  release();
  await expect(dialog.success()).toBeVisible();
  await expect(dialog.doneButton()).toBeEnabled();
});
