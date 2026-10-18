// Traces to: L2-002
import { test, expect } from '../support/test';
import { DAD, NIA } from '../support/accounts';
import { SignInPage } from '../pages/sign-in.page';
import { ReviewPage } from '../pages/review.page';
import { ShelfPage } from '../pages/shelf.page';

test('Given Dad’s username and password, when he signs in, then he lands on Review', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await expect(signIn.heading()).toHaveText('Welcome back');
  await signIn.signInWithPassword(DAD.username, DAD.password);

  await expect(page).toHaveURL(/\/review$/);
  await expect(new ReviewPage(page).heading()).toHaveText('Review');
});

test('Given Nia’s username and password, when she signs in, then she lands on her shelf', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.signInWithPassword(NIA.username, NIA.password);

  await expect(page).toHaveURL(/\/shelf$/);
  await expect(new ShelfPage(page).greeting()).toHaveText('Hi Nia');
});

test('Given the username typed in a different letter case, when Nia signs in, then it still works', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.signInWithPassword('NIA', NIA.password);

  await expect(page).toHaveURL(/\/shelf$/);
});

test('Given the form is empty, when Sign in is pressed, then each field says what is missing, the summary counts them, and nothing is sent', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.pressSignIn();

  await expect(signIn.failureSummary()).toContainText('Fill in 2 things');
  await expect(signIn.usernameField()).toHaveAccessibleDescription(/Type your username/);
  await expect(signIn.passwordField()).toHaveAccessibleDescription(/Type your password/);
  expect(signIn.passwordRequestCount()).toBe(0);
});

test('Given wrong credentials, when Dad signs in, then one generic error shows and his username stays in the box', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();

  await signIn.signInWithPassword(DAD.username, 'not-the-password');
  await expect(signIn.failureSummary()).toContainText('We couldn’t sign you in');
  await expect(signIn.failureSummary()).toContainText('Username or password is wrong');
  await expect(signIn.failureSummary()).toBeFocused();
  await expect(signIn.usernameField()).toHaveValue(DAD.username);

  await signIn.signInWithPassword('nobody', DAD.password);
  await expect(signIn.failureSummary()).toContainText('Username or password is wrong');
  await expect(page).toHaveURL(/\/sign-in$/);
});

test('Given a sign-in is in flight, when Dad submits again, then no second request is sent and the button shows busy', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  const release = await signIn.holdPasswordResponse();
  await signIn.fillCredentials(DAD.username, DAD.password);

  await signIn.submitWithEnter();
  await expect(signIn.signInButton()).toHaveAttribute('aria-busy', 'true');
  await signIn.submitWithEnter();
  release();

  await expect(page).toHaveURL(/\/review$/);
  expect(signIn.passwordRequestCount()).toBe(1);
});

test('Given the server cannot be reached, when Dad signs in, then he is told so and can try again', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.breakPasswordRequests();
  await signIn.signInWithPassword(DAD.username, DAD.password);

  await expect(signIn.failureSummary()).toContainText('Can’t reach Shelfie');
  await signIn.repairPasswordRequests();
  await signIn.tryAgain();

  await expect(page).toHaveURL(/\/review$/);
});

test('Given a typed password, when Show password is pressed, then the password is readable', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.fillCredentials(DAD.username, DAD.password);

  await signIn.showPassword();

  await expect(signIn.passwordField()).toHaveAttribute('type', 'text');
});
