// Traces to: L2-043
import { test, expect } from '../support/test';
import { signInAsDad } from '../support/signed-in';
import { ShellPage } from '../pages/shell.page';
import { ProfilePhotoDialog, fixture } from '../pages/profile-photo-dialog.page';

test('Given Dad has a photo, when a page opens, then his account button shows his photo in place of his initial', async ({ page }) => {
  await signInAsDad(page);
  await new ProfilePhotoDialog(page).uploadViaApi(fixture('dad.jpg'));
  const shell = new ShellPage(page);

  await page.reload();

  await expect(shell.accountPhoto('Dad')).toBeVisible();
  await expect.poll(() => shell.accountPhotoLoaded('Dad')).toBe(true);
});

test('Given Dad has no photo, when a page opens, then his account button shows his initial', async ({ page }) => {
  await signInAsDad(page);
  const shell = new ShellPage(page);

  await expect(shell.accountMenuButton('Dad')).toHaveText('D');
  await expect(shell.accountPhoto('Dad')).toHaveCount(0);
});

test('Given Dad’s photo cannot load, when a page opens, then his initial shows and no broken image', async ({ page }) => {
  await signInAsDad(page);
  await new ProfilePhotoDialog(page).uploadViaApi(fixture('dad.jpg'));
  const shell = new ShellPage(page);
  await shell.breakPhotos();

  await page.reload();

  await expect(shell.accountMenuButton('Dad')).toHaveText('D');
  await expect(shell.accountPhoto('Dad')).toHaveCount(0);
});
