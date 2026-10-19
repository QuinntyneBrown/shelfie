// Traces to: L2-033, L2-025
import { test, expect } from '../support/test';
import { DAD } from '../support/accounts';
import { SignUpPage } from '../pages/sign-up.page';
import { SignInPage } from '../pages/sign-in.page';
import { ShellPage } from '../pages/shell.page';
import { OnboardingPage } from '../pages/onboarding.page';

const PRIYA = { name: 'Priya', email: 'priya@example.com', username: 'priya', password: 'bookworm-2026' };

test('Given a new parent, when she creates an account, then a household of her own starts and she lands, signed in, on the set-up wizard', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.chooseCreateAccount();
  const signUp = new SignUpPage(page);
  await expect(signUp.heading()).toHaveText('Start your shelf');
  await signUp.fill(PRIYA);
  await signUp.submit();

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(new OnboardingPage(page).heading()).toHaveText('Let’s set up Shelfie for your family');
});

test('Given a username that is too short or has other characters, when submitted, then the field says so and nothing is sent', async ({ page }) => {
  const signUp = new SignUpPage(page);
  await signUp.open();

  await signUp.fill({ ...PRIYA, username: 'pr' });
  await signUp.submit();
  await expect(signUp.usernameField()).toHaveAccessibleDescription(/3–20 characters/);

  await signUp.fill({ ...PRIYA, username: 'priya bell!' });
  await signUp.submit();
  await expect(signUp.usernameField()).toHaveAccessibleDescription(/Letters, numbers, \. and _ only/);
  expect(signUp.requestCount()).toBe(0);
});

test('Given a malformed e-mail, a short password and boxes that differ, when submitted, then each field says what to fix and nothing is sent', async ({ page }) => {
  const signUp = new SignUpPage(page);
  await signUp.open();
  await signUp.fill({ ...PRIYA, email: 'priya@', password: 'short', confirm: 'shorter' });
  await signUp.submit();

  await expect(signUp.problemSummary()).toContainText('Fix 3 things');
  await expect(signUp.emailField()).toHaveAccessibleDescription(/Enter a valid e-mail/);
  await expect(signUp.passwordField()).toHaveAccessibleDescription(/At least 8 characters/);
  await expect(signUp.confirmField()).toHaveAccessibleDescription(/These don’t match/);
  expect(signUp.requestCount()).toBe(0);
});

test('Given a username a reader already has, in another case, and an e-mail already registered, when submitted, then both fields say so and nothing is created', async ({ page }) => {
  const signUp = new SignUpPage(page);
  await signUp.open();
  await signUp.fill({ ...PRIYA, username: 'NIA', email: DAD.email });
  await signUp.submit();

  await expect(signUp.problemSummary()).toContainText('Fix 2 things');
  await expect(signUp.usernameField()).toHaveAccessibleDescription(/That username is taken/);
  await expect(signUp.emailField()).toHaveAccessibleDescription(/That e-mail already has an account/);
  await expect(signUp.usernameField()).toHaveValue('NIA');
  await expect(page).toHaveURL(/\/sign-up$/);

  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.signInWithPassword('NIA', PRIYA.password);
  await expect(signIn.failureSummary()).toContainText('Username or password is wrong');
});

test('Given the server cannot be reached, when submitted, then an error with Try again shows and everything typed stays', async ({ page }) => {
  const signUp = new SignUpPage(page);
  await signUp.open();
  await signUp.breakSignUp();
  await signUp.fill(PRIYA);
  await signUp.submit();

  await expect(signUp.failure()).toBeVisible();
  await expect(signUp.nameField()).toHaveValue(PRIYA.name);
  await expect(signUp.usernameField()).toHaveValue(PRIYA.username);
  await signUp.repairSignUp();
  await signUp.tryAgain();

  await expect(page).toHaveURL(/\/onboarding$/);
});

test('Given a window tall enough for the whole form, when sign-up shows, then the page does not scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1400 });
  const signUp = new SignUpPage(page);
  await signUp.open();
  await expect(signUp.heading()).toBeVisible();

  expect(await new ShellPage(page).scrollsDown()).toBe(false);
});
