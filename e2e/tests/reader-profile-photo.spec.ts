// Traces to: L2-042, L2-043
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { ShellPage } from '../pages/shell.page';
import { SettingsPage } from '../pages/settings.page';
import { ProfilePhotoDialog, fixture } from '../pages/profile-photo-dialog.page';

test('Given Nia without a photo, when she adds one from My photo, then she is told it worked and it replaces her initial in the top bar', async ({ page }) => {
  await signInAsNia(page);
  const shell = new ShellPage(page);
  const dialog = new ProfilePhotoDialog(page);

  await shell.openMyPhoto('Nia');
  await dialog.choose(fixture('nia.jpg'));

  await expect(dialog.success()).toContainText('Looking great, Nia!');
  await dialog.done();
  await expect(shell.accountPhoto('Nia')).toBeVisible();
  await expect.poll(() => shell.accountPhotoLoaded('Nia')).toBe(true);
});

test('Given Nia has a photo, when she chooses another, then the new one replaces it', async ({ page }) => {
  await signInAsNia(page);
  const dialog = new ProfilePhotoDialog(page);
  await dialog.uploadViaApi(fixture('nia.jpg'));
  await page.reload();
  const shell = new ShellPage(page);
  const before = await shell.accountPhotoUrl('Nia');

  await shell.openMyPhoto('Nia');
  await dialog.choose(fixture('dad.jpg'));
  await expect(dialog.success()).toBeVisible();
  await dialog.done();

  await expect(shell.accountPhoto('Nia')).not.toHaveAttribute('src', before!);
});

test('Given Nia has a photo, when she removes it from My photo, then her initial comes back', async ({ page }) => {
  await signInAsNia(page);
  const dialog = new ProfilePhotoDialog(page);
  await dialog.uploadViaApi(fixture('nia.jpg'));
  await page.reload();
  const shell = new ShellPage(page);

  await shell.openMyPhoto('Nia');
  await dialog.remove();
  await dialog.done();

  await expect(shell.accountPhoto('Nia')).toHaveCount(0);
  await expect(shell.accountMenuButton('Nia')).toHaveText('N');
});

test('Given Nia has a photo, when Dad opens Settings, then her row in Readers shows it', async ({ page }) => {
  await signInAsNia(page);
  await new ProfilePhotoDialog(page).uploadViaApi(fixture('nia.jpg'));
  await page.context().clearCookies();
  await signInAsDad(page);
  const settings = new SettingsPage(page);

  await settings.open();

  await expect(settings.readerPhoto('Nia')).toBeVisible();
});
