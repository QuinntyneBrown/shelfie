// Traces to: L2-002
import { test, expect } from '../support/test';
import { DAD } from '../support/accounts';
import { SignInPage } from '../pages/sign-in.page';
import { ReviewPage } from '../pages/review.page';

test('Given a browser that has not signed in before, when Dad enters his e-mail and password, then he lands on Review', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.signInWithPassword(DAD.email, DAD.password);

  await expect(page).toHaveURL(/\/review$/);
  await expect(new ReviewPage(page).heading()).toHaveText('Review');
});

test('Given the form is empty, when Dad presses Sign in, then each field says what is missing and nothing is sent', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.pressSignIn();

  await expect(signIn.emailField()).toHaveAccessibleDescription(/Enter your e-mail/);
  await expect(signIn.passwordField()).toHaveAccessibleDescription(/Enter your password/);
  expect(signIn.passwordRequestCount()).toBe(0);
});

test('Given the e-mail is malformed, when Dad presses Sign in, then the e-mail field says so and nothing is sent', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.signInWithPassword('dad@', DAD.password);

  await expect(signIn.emailField()).toHaveAccessibleDescription(/Enter a valid e-mail/);
  await expect(signIn.passwordField()).not.toHaveAttribute('aria-invalid', 'true');
  expect(signIn.passwordRequestCount()).toBe(0);
});
