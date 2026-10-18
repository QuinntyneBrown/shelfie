// Traces to: L2-042, L2-043
import { test, expect } from '../support/test';
import { signInAsDad } from '../support/signed-in';
import { ShellPage } from '../pages/shell.page';
import { SettingsPage } from '../pages/settings.page';
import { ProfilePhotoDialog, fixture } from '../pages/profile-photo-dialog.page';

test('Given Dad without a photo, when he adds one in Settings, then he is told it worked and it replaces his initial in the top bar and Settings', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  const dialog = new ProfilePhotoDialog(page);
  const shell = new ShellPage(page);
  await settings.open();

  await settings.openPhotoDialog();
  await dialog.choose(fixture('dad.jpg'));

  await expect(dialog.success()).toContainText('Looking great, Dad!');
  await dialog.done();
  await expect(dialog.dialog()).toBeHidden();
  await expect(shell.accountPhoto('Dad')).toBeVisible();
  await expect(settings.ownPhoto()).toBeVisible();
  await expect(settings.photoButton()).toHaveText('Change photo');
});

test('Given Dad has a photo, when he chooses another, then the new one replaces it everywhere and the old one is no longer served', async ({ page }) => {
  await signInAsDad(page);
  const dialog = new ProfilePhotoDialog(page);
  await dialog.uploadViaApi(fixture('dad.jpg'));
  const settings = new SettingsPage(page);
  const shell = new ShellPage(page);
  await settings.open();
  const before = (await shell.accountPhotoUrl('Dad'))!;
  const oldPhoto = await dialog.download(before);

  await settings.openPhotoDialog();
  await dialog.choose(fixture('nia.jpg'));
  await expect(dialog.success()).toBeVisible();
  await dialog.done();

  await expect(shell.accountPhoto('Dad')).not.toHaveAttribute('src', before);
  const after = (await shell.accountPhotoUrl('Dad'))!;
  expect(await dialog.download(after)).not.toEqual(oldPhoto);
  expect(await dialog.download(before)).not.toEqual(oldPhoto);
});

test('Given Dad has a photo, when he removes it, then his initial comes back in the top bar and Settings and stays after a reload', async ({ page }) => {
  await signInAsDad(page);
  await new ProfilePhotoDialog(page).uploadViaApi(fixture('dad.jpg'));
  const settings = new SettingsPage(page);
  const dialog = new ProfilePhotoDialog(page);
  const shell = new ShellPage(page);
  await settings.open();

  await settings.openPhotoDialog();
  await dialog.remove();
  await dialog.done();

  await expect(shell.accountPhoto('Dad')).toHaveCount(0);
  await expect(shell.accountMenuButton('Dad')).toHaveText('D');
  await expect(settings.ownPhoto()).toHaveCount(0);
  await expect(settings.photoButton()).toHaveText('Add a photo');
  await page.reload();
  await expect(shell.accountMenuButton('Dad')).toHaveText('D');
  await expect(shell.accountPhoto('Dad')).toHaveCount(0);
});

test('Given Dad closes Your photo, then focus goes back to the button that opened it', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  const dialog = new ProfilePhotoDialog(page);
  await settings.open();
  await settings.openPhotoDialog();

  await dialog.done();

  await expect(dialog.dialog()).toBeHidden();
  await expect(settings.photoButton()).toBeFocused();
});
