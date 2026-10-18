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
