// Traces to: L2-021, L2-005
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { ShellPage } from '../pages/shell.page';
import { SettingsPage } from '../pages/settings.page';
import { ErrorPage } from '../pages/error.page';
import { SignInPage } from '../pages/sign-in.page';
import { DAD } from '../support/accounts';

test('Given Dad is signed in, when he chooses Settings from his account menu, then the page shows how the household is set up now', async ({ page }) => {
  await signInAsDad(page);
  const shell = new ShellPage(page);
  await shell.openAccountMenu('Dad');
  await shell.menuItem('Settings').click();

  const settings = new SettingsPage(page);
  await expect(settings.heading()).toHaveText('Settings');
  await expect(settings.yourName()).toHaveValue('Dad');
  await expect(settings.username()).toHaveValue('dad');
  await expect(settings.username()).toHaveAttribute('readonly');
  await expect(settings.email()).toHaveValue('dad@example.com');
  await expect(settings.parent('Dad')).toContainText('You · @dad');
  await expect(settings.reader('Nia')).toContainText('@nia');
});

test('Given Settings is open, when Dad chooses Sign out at the bottom, then his session ends and the sign-in page shows', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.signOut();

  await expect(new SignInPage(page).heading()).toHaveText('Welcome back');
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/sign-in$/);
});

test('Given the settings cannot be loaded, when Dad opens the page, then it says so and Try again loads them', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.breakLoading();
  await settings.open();
  await expect(settings.loadFailure()).toBeVisible();

  await settings.repairLoading();
  await settings.tryLoadingAgain();

  await expect(settings.yourName()).toHaveValue('Dad');
});

test('Given Nia is signed in, when she opens Settings, then it is for grown-ups only, on the page and in the API', async ({ page }) => {
  await signInAsNia(page);
  const settings = new SettingsPage(page);

  const response = await settings.getViaApi();
  await page.goto('/settings');

  expect(response.status()).toBe(403);
  expect((await response.json()).type).toBe('grown-ups-only');
  await expect(new ErrorPage(page).heading()).toHaveText('This part is for grown-ups');
});

test('Given nobody is signed in, when the settings are asked for, then the API says 401', async ({ page }) => {
  const response = await new SettingsPage(page).getViaApi();

  expect(response.status()).toBe(401);
});

test('Given Dad changes his own display name, when he saves, then the top bar shows it at once', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.setYourName('Marcus');
  await settings.save();

  await expect(settings.banner()).toBeVisible();
  await expect(new ShellPage(page).accountMenuButton('Marcus')).toBeVisible();
});

test('Given a new password that is short or typed differently twice, when Dad saves, then each box says what is wrong and nothing is sent', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  settings.watchSaves();
  await settings.open();

  await settings.setNewPassword('short');
  await settings.save();
  await expect(settings.newPasswordField()).toHaveAccessibleDescription(/Use at least 8 characters/);

  await settings.setNewPassword('long-enough-1', 'long-enough-2');
  await settings.save();
  await expect(settings.confirmField()).toHaveAccessibleDescription(/These don’t match\. Type the same password in both boxes\./);
  expect(settings.saveRequestCount()).toBe(0);
});

test('Given a new password and a wrong current password, when Dad saves, then it is refused, nothing changes and what he typed stays', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.setNewPassword('brand-new-pass-1');
  await settings.setCurrentPassword('not-my-password');
  await settings.save();

  await expect(settings.failureBanner()).toContainText('Your current password isn’t right');
  await expect(settings.newPasswordField()).toHaveValue('brand-new-pass-1');
  await expect(settings.banner()).toBeHidden();
});

test('Given a new password and the right current one, when Dad saves, then he signs in with the new password and not the old', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.setNewPassword('brand-new-pass-1');
  await settings.setCurrentPassword(DAD.password);
  await settings.save();
  await expect(settings.banner()).toBeVisible();

  const shell = new ShellPage(page);
  await shell.openAccountMenu('Dad');
  await shell.menuItem('Sign out').click();
  const signIn = new SignInPage(page);
  await signIn.signInWithPassword(DAD.username, DAD.password);
  await expect(signIn.failureSummary()).toBeVisible();
  await signIn.signInWithPassword(DAD.username, 'brand-new-pass-1');

  await expect(page).toHaveURL(/\/review$/);
});

test('Given a new e-mail address, when Dad saves without his current password, then it is refused', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.setEmail('marcus@example.com');
  await settings.save();

  await expect(settings.failureBanner()).toContainText('Your current password isn’t right');
  await expect(settings.banner()).toBeHidden();
});

test('Given a new e-mail address and the current password, when Dad saves, then the new address is kept', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.setEmail('marcus@example.com');
  await settings.setCurrentPassword(DAD.password);
  await settings.save();
  await expect(settings.banner()).toBeVisible();

  await settings.open();

  await expect(settings.email()).toHaveValue('marcus@example.com');
});

test('Given an e-mail address another family already uses, when Dad saves, then it is refused and he is told why', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.setEmail('other@example.com');
  await settings.setCurrentPassword(DAD.password);
  await settings.save();

  await expect(settings.failureBanner()).toContainText('That e-mail address is already in use');
  await expect(settings.email()).toHaveValue('other@example.com');
});

test('Given the server cannot be reached, when Dad saves, then he is told and everything he typed stays so he can save again', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  await settings.open();
  await settings.setYourName('Marcus');
  await settings.breakSaving();
  await settings.save();

  await expect(settings.failureBanner()).toBeVisible();
  await expect(settings.yourName()).toHaveValue('Marcus');

  await settings.repairSaving();
  await settings.save();
  await expect(settings.banner()).toBeVisible();
  await expect(settings.failureBanner()).toBeHidden();
});

test('Given a name that is too long or a malformed e-mail, when Dad saves, then each field says what to fix and nothing is sent', async ({ page }) => {
  await signInAsDad(page);
  const settings = new SettingsPage(page);
  settings.watchSaves();
  await settings.open();
  await settings.setYourName('x'.repeat(41));
  await settings.setEmail('dad@');
  await settings.save();

  await expect(settings.yourName()).toHaveAccessibleDescription(/Use 40 characters or fewer/);
  await expect(settings.email()).toHaveAccessibleDescription(/Enter an e-mail address like name@example.com/);
  await expect(settings.problemSummary()).toContainText('Fix 2 things');
  expect(settings.saveRequestCount()).toBe(0);
});
