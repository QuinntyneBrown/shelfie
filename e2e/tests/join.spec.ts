// Traces to: L2-144, L2-148, L2-025
import { test, expect } from '../support/test';
import { JoinPage } from '../pages/join.page';
import { MyProfilePage } from '../pages/my-profile.page';
import { SignInPage } from '../pages/sign-in.page';
import { ShellPage } from '../pages/shell.page';
import { DAD, ROSA, SAM } from '../support/accounts';
import { clearMailbox, resetLinkFor } from '../support/mailbox';
import { ForgotPasswordPage } from '../pages/forgot-password.page';
import { ResetPasswordPage } from '../pages/reset-password.page';


test('Given Rosa, an author, when she joins from Sign in, then she lands on My profile signed in with My profile and My catalogue to go to', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.chooseJoin();
  const join = new JoinPage(page);
  await expect(join.heading()).toHaveText('Join Shelfie');
  await join.chooseAuthor();
  await join.fill(ROSA);
  await join.submit();

  await expect(page).toHaveURL(/\/me$/);
  const profile = new MyProfilePage(page);
  await expect(profile.heading()).toHaveText('My profile');
  await expect(profile.navigation()).toHaveText(['My profile', 'My catalogue']);
});

test('Given Sam, a volunteer, when he joins, then he lands on My profile with no tabs and only Sign out in his menu', async ({ page }) => {
  const join = new JoinPage(page);
  await join.open();
  await join.chooseVolunteer();
  await join.fill(SAM);
  await join.submit();

  await expect(page).toHaveURL(/\/me$/);
  const profile = new MyProfilePage(page);
  await expect(profile.heading()).toHaveText('My profile');
  await expect(profile.navigation()).toHaveCount(0);
  const shell = new ShellPage(page);
  await shell.openAccountMenu('Sam Okafor');
  await expect(shell.menu()).toBeVisible();
  expect(await shell.menuItemNames()).toEqual(['Sign out']);
});

test('Given Rosa joined, when she signs out and back in, then she lands on My profile, and Sign in sends her there while she is signed in', async ({ page }) => {
  const join = new JoinPage(page);
  await join.open();
  await join.chooseAuthor();
  await join.fill(ROSA);
  await join.submit();
  await page.waitForURL('**/me');
  const shell = new ShellPage(page);
  await shell.signOut('Rosa Delgado');

  const signIn = new SignInPage(page);
  await signIn.signInWithPassword(ROSA.username, ROSA.password);
  await expect(page).toHaveURL(/\/me$/);

  await signIn.open();
  await expect(page).toHaveURL(/\/me$/);
});

test('Given an empty name, a malformed e-mail, a short username and passwords that differ, when submitted, then each field says what to fix and nothing is sent', async ({ page }) => {
  const join = new JoinPage(page);
  await join.open();
  await join.chooseAuthor();
  await join.fill({ name: ' ', email: 'rosa@example', username: 'ro', password: 'short', confirm: 'shorter' });
  await join.submit();

  await expect(join.problemSummary()).toContainText('Fix 5 things');
  await expect(join.nameField()).toHaveAttribute('aria-invalid', 'true');
  await expect(join.emailField()).toHaveAttribute('aria-invalid', 'true');
  expect(join.requestCount()).toBe(0);
});

test('Given Dad’s e-mail and username, when Rosa joins with them, then both fields say they are taken and she stays on Join', async ({ page }) => {
  const join = new JoinPage(page);
  await join.open();
  await join.chooseAuthor();
  await join.fill({ ...ROSA, email: DAD.email, username: DAD.username.toUpperCase() });
  await join.submit();

  await expect(join.problemSummary()).toContainText('Fix 2 things');
  await expect(page.getByText('That e-mail already has an account.')).toBeVisible();
  await expect(page.getByText('That username is taken.')).toBeVisible();
  await expect(page).toHaveURL(/\/join$/);
});

test('Given the server cannot be reached, when Rosa joins, then an error with Try again shows and everything typed stays', async ({ page }) => {
  const join = new JoinPage(page);
  await join.open();
  await join.chooseAuthor();
  await join.fill(ROSA);
  await join.breakJoin();
  await join.submit();

  await expect(join.failure()).toBeVisible();
  await expect(join.nameField()).toHaveValue(ROSA.name);
  await join.repairJoin();
  await join.tryAgain();
  await expect(page).toHaveURL(/\/me$/);
});

test('Given Sam forgot his password, when he sets a new one from the mailed link, then he goes on to My profile', async ({ page }) => {
  clearMailbox();
  const join = new JoinPage(page);
  await join.open();
  await join.chooseVolunteer();
  await join.fill(SAM);
  await join.submit();
  await page.waitForURL('**/me');
  await new ShellPage(page).signOut('Sam Okafor');

  const forgot = new ForgotPasswordPage(page);
  await forgot.open();
  await forgot.requestLink(SAM.email);
  const reset = new ResetPasswordPage(page);
  await reset.openLink(await resetLinkFor(SAM.email));
  await reset.choosePassword('a-brand-new-one');
  await reset.goToMyProfile();

  await expect(page).toHaveURL(/\/me$/);
});
