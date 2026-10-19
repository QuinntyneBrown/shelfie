// Traces to: L2-137, L2-138, L2-139, L2-140
import { test, expect } from '../support/test';
import { DAD } from '../support/accounts';
import { providerAnswers, providerCancels, providerFails } from '../support/provider';
import { giveNiaAnEmail } from '../support/database';
import { SignInPage } from '../pages/sign-in.page';
import { SignUpPage } from '../pages/sign-up.page';
import { ReviewPage } from '../pages/review.page';
import { ShellPage } from '../pages/shell.page';
import { ForgotPasswordPage } from '../pages/forgot-password.page';
import { ResetPasswordPage } from '../pages/reset-password.page';
import { resetLinkFor } from '../support/mailbox';

const PRIYA = { email: 'priya@example.com', name: 'Priya Bell' };

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

test('Given nobody has priya@example.com, when Priya continues with Google from sign-up, then a household of her own starts and she lands on Review signed in', async ({ page }) => {
  providerAnswers({ email: PRIYA.email, name: PRIYA.name, verified: true });
  const signUp = new SignUpPage(page);
  await signUp.open();

  await signUp.continueWith('Google');

  await expect(page).toHaveURL(/\/review$/);
  const review = new ReviewPage(page);
  await expect(review.heading()).toHaveText('Review');
  await expect(review.caughtUp()).toBeVisible();
  const shell = new ShellPage(page);
  await shell.openAccountMenu('Priya Bell');
  await expect(shell.menu()).toContainText('@priya · parent');
});

test('Given Priya’s account came from Google, when she tries her generated username with a password, then it fails, and once she sets one through Forgot password both ways in work', async ({ page }) => {
  providerAnswers({ email: PRIYA.email, name: PRIYA.name, verified: true });
  const signUp = new SignUpPage(page);
  await signUp.open();
  await signUp.continueWith('Google');
  await expect(page).toHaveURL(/\/review$/);
  const shell = new ShellPage(page);
  await shell.openAccountMenu('Priya Bell');
  await shell.menuItem('Sign out').click();

  const signIn = new SignInPage(page);
  await signIn.signInWithPassword('priya', 'any-password-1');
  await expect(signIn.failureSummary()).toContainText('Username or password is wrong');

  const forgot = new ForgotPasswordPage(page);
  await forgot.open();
  await forgot.requestLink(PRIYA.email);
  await expect(forgot.confirmation()).toBeVisible();
  const reset = new ResetPasswordPage(page);
  await reset.openLink(await resetLinkFor(PRIYA.email));
  await reset.choosePassword('bookworm-2026');
  await reset.goToReview();
  await expect(page).toHaveURL(/\/review$/);
  await shell.openAccountMenu('Priya Bell');
  await shell.menuItem('Sign out').click();

  await signIn.signInWithPassword('priya', 'bookworm-2026');
  await expect(page).toHaveURL(/\/review$/);
  await signIn.open();
  await expect(page).toHaveURL(/\/review$/);
});

test('Given Dad has continued with Google before, when Google now reports a different e-mail for the same account, then he still signs in as Dad', async ({ page }) => {
  providerAnswers({ subject: 'google-dad', email: DAD.email, name: 'Dad', verified: true });
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.continueWith('Google');
  await expect(page).toHaveURL(/\/review$/);
  const shell = new ShellPage(page);
  await shell.openAccountMenu('Dad');
  await shell.menuItem('Sign out').click();
  await expect(page).toHaveURL(/\/sign-in$/);

  providerAnswers({ subject: 'google-dad', email: 'dad.new@example.com', name: 'Dad', verified: true });
  await signIn.continueWith('Google');

  await expect(page).toHaveURL(/\/review$/);
  await shell.openAccountMenu('Dad');
  await expect(shell.menu()).toContainText('@dad · parent');
});

test('Given the e-mail Google vouches for belongs to Nia, a reader, when Dad continues with Google, then he is back on sign-in with a banner and nothing is created', async ({ page }) => {
  await giveNiaAnEmail('nia@example.com');
  providerAnswers({ email: 'nia@example.com', name: 'Nia', verified: true });
  const signIn = new SignInPage(page);
  await signIn.open();

  await signIn.continueWith('Google');

  await expect(page).toHaveURL(/\/sign-in\?reason=reader&provider=google$/);
  await expect(signIn.providerBanner()).toContainText('That e-mail belongs to a reader');
  await expect(signIn.signInButton()).toBeVisible();
  await signIn.signInWithPassword(DAD.username, DAD.password);
  await expect(page).toHaveURL(/\/review$/);
});

test('Given Google has not verified the e-mail, when a parent continues with Google from sign-up, then she is back on sign-up with a banner saying Google didn’t share an e-mail', async ({ page }) => {
  providerAnswers({ email: PRIYA.email, name: PRIYA.name, verified: false });
  const signUp = new SignUpPage(page);
  await signUp.open();

  await signUp.continueWith('Google');

  await expect(page).toHaveURL(/\/sign-up\?reason=no-email&provider=google$/);
  await expect(signUp.providerBanner()).toContainText('Google didn’t share an e-mail');
  await expect(signUp.nameField()).toBeVisible();
});

test('Given the parent cancels on Google’s consent screen, then she is back where she started with a "You cancelled" notice', async ({ page }) => {
  providerCancels();
  const signIn = new SignInPage(page);
  await signIn.open();

  await signIn.continueWith('Google');

  await expect(page).toHaveURL(/\/sign-in\?reason=cancelled&provider=google$/);
  await expect(signIn.providerBanner()).toContainText('You cancelled');
});

test('Given Google answers with an error, then the parent is back where she started with "Something went wrong"', async ({ page }) => {
  providerFails();
  const signUp = new SignUpPage(page);
  await signUp.open();

  await signUp.continueWith('Facebook');

  await expect(page).toHaveURL(/\/sign-up\?reason=failed&provider=facebook$/);
  await expect(signUp.providerBanner()).toContainText('Something went wrong. Try again');
  await expect(signUp.providerBanner()).toContainText('Facebook');
});
