// Traces to: L2-137
import { test, expect } from '../support/test';
import { SignInPage } from '../pages/sign-in.page';
import { SignUpPage } from '../pages/sign-up.page';

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
