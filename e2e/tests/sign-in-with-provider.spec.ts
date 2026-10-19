// Traces to: L2-137, L2-138
import { test, expect } from '../support/test';
import { DAD } from '../support/accounts';
import { providerAnswers } from '../support/provider';
import { SignInPage } from '../pages/sign-in.page';
import { SignUpPage } from '../pages/sign-up.page';
import { ReviewPage } from '../pages/review.page';
import { ShellPage } from '../pages/shell.page';

test('Given Google and Facebook are configured, when sign-in opens, then both Continue buttons show below the form, labelled for parents', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();

  await expect(signIn.parentsCanAlso()).toBeVisible();
  await expect(signIn.continueWithButton('Google')).toBeVisible();
  await expect(signIn.continueWithButton('Facebook')).toBeVisible();
  await expect(signIn.signInButton()).toBeVisible();
  await expect(signIn.usernameField()).toBeVisible();
});

test('Given Google and Facebook are configured, when sign-up opens, then both Continue buttons show under an "or" line', async ({ page }) => {
  const signUp = new SignUpPage(page);
  await signUp.open();

  await expect(signUp.orLine()).toBeVisible();
  await expect(signUp.continueWithButton('Google')).toBeVisible();
  await expect(signUp.continueWithButton('Facebook')).toBeVisible();
});

test.describe('one provider', () => {
  test.use({ providers: 'google' });

  test('Given only Google is configured, when sign-in and sign-up open, then only Continue with Google shows', async ({ page }) => {
    const signIn = new SignInPage(page);
    await signIn.open();
    await expect(signIn.continueWithButton('Google')).toBeVisible();
    await expect(signIn.continueWithButton('Facebook')).toHaveCount(0);

    const signUp = new SignUpPage(page);
    await signUp.open();
    await expect(signUp.continueWithButton('Google')).toBeVisible();
    await expect(signUp.continueWithButton('Facebook')).toHaveCount(0);
  });
});

test.describe('no providers', () => {
  test.use({ providers: 'none' });

  test('Given no provider is configured, when sign-in and sign-up open, then neither the buttons nor the line show', async ({ page }) => {
    const signIn = new SignInPage(page);
    await signIn.open();
    await expect(signIn.signInButton()).toBeVisible();
    await expect(signIn.continueWithButton('Google')).toHaveCount(0);
    await expect(signIn.parentsCanAlso()).toHaveCount(0);

    const signUp = new SignUpPage(page);
    await signUp.open();
    await expect(signUp.continueWithButton('Facebook')).toHaveCount(0);
    await expect(signUp.orLine()).toHaveCount(0);
  });
});

test('Given Dad has an account with dad@example.com, when he continues with Google and Google vouches for that e-mail, then he lands on Review signed in as himself', async ({ page }) => {
  providerAnswers({ email: DAD.email, name: 'Dad', verified: true });
  const signIn = new SignInPage(page);
  await signIn.open();

  await signIn.continueWith('Google');

  await expect(page).toHaveURL(/\/review$/);
  await expect(new ReviewPage(page).heading()).toHaveText('Review');
  const shell = new ShellPage(page);
  await shell.openAccountMenu('Dad');
  await expect(shell.menu()).toContainText('@dad · parent');
});

test('Given Continue with Google is pressed, when the browser is still leaving, then the button is busy and a second press sends nothing', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.swallowProviderStart();

  await signIn.continueWith('Google');
  await expect(signIn.continueWithButton('Google')).toHaveAttribute('aria-busy', 'true');
  await signIn.continueWithButton('Google').click({ force: true, noWaitAfter: true });
  await expect(signIn.continueWithButton('Facebook')).toBeVisible();

  expect(signIn.providerStartCount()).toBe(1);
});
