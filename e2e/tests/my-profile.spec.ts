// Traces to: L2-161, L2-162, L2-163
import { test, expect } from '../support/test';
import { ROSA, SAM } from '../support/accounts';
import { joinAsRosa, joinAsSam } from '../support/signed-in';
import { setProfileStatus } from '../support/database';
import { MyProfilePage } from '../pages/my-profile.page';
import { ShellPage } from '../pages/shell.page';
import { fixture } from '../pages/profile-photo-dialog.page';

const ABOUT = 'I write adventure stories for readers aged 7 to 11, about brave animals and the kids who befriend them.';

test('Given Rosa just joined, when she writes about herself and her website and saves, then she is told it is saved, it is still there next time, and she is waiting for approval', async ({ page }) => {
  await joinAsRosa(page);
  const profile = new MyProfilePage(page);
  await expect(profile.status()).toContainText('Waiting for approval');
  await expect(profile.nameField()).toHaveValue(ROSA.name);

  await profile.aboutField().fill(ABOUT);
  await profile.websiteField().fill('https://rosadelgado.example.com');
  await profile.save();

  await expect(profile.savedToast()).toBeVisible();
  await page.reload();
  await expect(profile.aboutField()).toHaveValue(ABOUT);
  await expect(profile.websiteField()).toHaveValue('https://rosadelgado.example.com');
  await expect(profile.status()).toContainText('Waiting for approval');
});

test('Given Rosa, when she renames herself, then the top bar shows the new name without signing in again', async ({ page }) => {
  await joinAsRosa(page);
  const profile = new MyProfilePage(page);
  await profile.nameField().fill('Rosa D.');
  await profile.aboutField().fill(ABOUT);
  await profile.save();

  await expect(profile.savedToast()).toBeVisible();
  await expect(new ShellPage(page).accountMenuButton('Rosa D.')).toBeVisible();
});

test('Given an empty name, no about and a website without https://, when Rosa saves, then each field says what to fix and nothing is sent', async ({ page }) => {
  await joinAsRosa(page);
  const profile = new MyProfilePage(page);
  await profile.nameField().fill('');
  await profile.websiteField().fill('rosadelgado');
  await profile.save();

  await expect(profile.problemSummary()).toContainText('Fix 3 things');
  await expect(profile.websiteField()).toHaveAccessibleDescription(/Enter a full web address starting with https:\/\//);
  expect(profile.saveCount()).toBe(0);
});

test('Given the server cannot be reached, when Rosa saves, then she is told her changes weren’t saved and they stay until Try again works', async ({ page }) => {
  await joinAsRosa(page);
  const profile = new MyProfilePage(page);
  await profile.aboutField().fill(ABOUT);
  await profile.breakSaving();
  await profile.save();

  await expect(profile.failure()).toBeVisible();
  await expect(profile.aboutField()).toHaveValue(ABOUT);
  await profile.repairSaving();
  await profile.tryAgain();
  await expect(profile.savedToast()).toBeVisible();
});

test('Given Sam, a volunteer, when he writes the ages he helps with and how parents can reach him, then they are saved and he has no website field', async ({ page }) => {
  await joinAsSam(page);
  const profile = new MyProfilePage(page);
  await expect(profile.websiteField()).toHaveCount(0);

  await profile.aboutField().fill('Retired Year 3 teacher.');
  await profile.agesField().fill('Ages 6 to 10');
  await profile.contactField().fill('sam.okafor@example.com · weekday afternoons');
  await profile.save();

  await expect(profile.savedToast()).toBeVisible();
  await page.reload();
  await expect(profile.agesField()).toHaveValue('Ages 6 to 10');
  await expect(profile.contactField()).toHaveValue('sam.okafor@example.com · weekday afternoons');
  await expect(profile.nameField()).toHaveValue(SAM.name);
});

test('Given Rosa, when she chooses a photo, then it uploads at once and shows in the top bar; Remove photo takes it away', async ({ page }) => {
  await joinAsRosa(page);
  const profile = new MyProfilePage(page);
  const shell = new ShellPage(page);

  await profile.choosePhoto(fixture('dad.jpg'));
  await expect(shell.accountPhoto(ROSA.name)).toHaveAttribute('src', /\/api\/me\/photo\?v=/);
  await expect.poll(() => shell.accountPhotoLoaded(ROSA.name)).toBe(true);

  await profile.removePhoto();
  await expect(shell.accountPhoto(ROSA.name)).toHaveCount(0);
});

test('Given the operator approved, then hid, Rosa’s profile, when she opens My profile, then the banner says so each time', async ({ page }) => {
  await joinAsRosa(page);
  const profile = new MyProfilePage(page);

  await setProfileStatus(ROSA.username, 'approved');
  await page.reload();
  await expect(profile.status()).toContainText('Parents can see your profile');

  await setProfileStatus(ROSA.username, 'hidden');
  await page.reload();
  await expect(profile.status()).toContainText('Hidden by Shelfie');
});
