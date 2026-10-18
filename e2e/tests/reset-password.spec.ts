// Traces to: L2-004
import { test, expect } from '../support/test';
import { DAD } from '../support/accounts';
import { clearMailbox, mailFor, resetLinkFor } from '../support/mailbox';
import { signInAsDad } from '../support/signed-in';
import { expireResetLinks } from '../support/database';
import { ResetPasswordPage } from '../pages/reset-password.page';
import { ForgotPasswordPage } from '../pages/forgot-password.page';
import { SignInPage } from '../pages/sign-in.page';

test.beforeEach(async () => {
  await clearMailbox();
});

test('Given Dad forgot his password, when he follows Forgot your password? and asks for a link, then he is told one is on its way and the mail arrives', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.chooseForgotPassword();

  const forgot = new ForgotPasswordPage(page);
  await expect(forgot.heading()).toHaveText('Forgot your password?');
  await forgot.requestLink(DAD.email);

  await expect(forgot.confirmation()).toContainText(`If ${DAD.email} has a Shelfie account, a reset link is on its way.`);
  await expect.poll(async () => (await mailFor(DAD.email)).length).toBe(1);
});

test('Given an address with no account, when a link is asked for, then the same message shows and no mail is sent', async ({ page }) => {
  const forgot = new ForgotPasswordPage(page);
  await forgot.open();
  await forgot.requestLink('nobody@example.com');

  await expect(forgot.confirmation()).toContainText('If nobody@example.com has a Shelfie account, a reset link is on its way.');
  await new Promise((resolve) => setTimeout(resolve, 500));
  expect((await mailFor('nobody@example.com')).length).toBe(0);
});

test('Given a malformed e-mail, when Dad asks for a link, then he is told what to fix and nothing is sent', async ({ page }) => {
  const forgot = new ForgotPasswordPage(page);
  forgot.watchRequests();
  await forgot.open();
  await forgot.requestLink('dad@');

  await expect(forgot.problemSummary()).toContainText('E-mail address is not complete');
  await expect(forgot.emailField()).toHaveAccessibleDescription(/Enter the e-mail address you sign in with, like name@example\.com\./);
  expect(forgot.requestCount()).toBe(0);
});

test('Given a reset link, when Dad chooses a new password, then he is signed in on Review and only the new password works', async ({ page, browser, baseURL }) => {
  const forgot = new ForgotPasswordPage(page);
  await forgot.open();
  await forgot.requestLink(DAD.email);
  const link = await resetLinkFor(DAD.email);

  const reset = new ResetPasswordPage(page);
  await reset.openLink(link);
  await expect(reset.heading()).toHaveText('Choose a new password');
  await expect(reset.forAddress()).toContainText(DAD.email);
  await reset.choosePassword('a-fresh-password-7');
  await expect(reset.heading()).toHaveText('Password updated');
  await reset.goToReview();
  await expect(page).toHaveURL(/\/review$/);

  const elsewhere = await browser.newContext({ baseURL });
  const other = await elsewhere.newPage();
  const signIn = new SignInPage(other);
  await signIn.open();
  await signIn.signInWithPassword(DAD.username, DAD.password);
  await expect(signIn.failureSummary()).toBeVisible();
  await signIn.signInWithPassword(DAD.username, 'a-fresh-password-7');
  await expect(other).toHaveURL(/\/review$/);
  await elsewhere.close();
});

test('Given Dad is signed in on another device, when he resets his password, then that device’s session ends', async ({ page, browser, baseURL }) => {
  const elsewhere = await browser.newContext({ baseURL });
  const other = await elsewhere.newPage();
  await signInAsDad(other);
  expect((await other.request.get('/api/auth/session')).status()).toBe(200);

  const forgot = new ForgotPasswordPage(page);
  await forgot.open();
  await forgot.requestLink(DAD.email);
  const reset = new ResetPasswordPage(page);
  await reset.openLink(await resetLinkFor(DAD.email));
  await reset.choosePassword('a-fresh-password-7');
  await expect(reset.heading()).toHaveText('Password updated');

  expect((await other.request.get('/api/auth/session')).status()).toBe(401);
  await elsewhere.close();
});

test('Given a reset link that has been used, when it is opened again and submitted, then Dad is told it has expired and can ask for a new one', async ({ page }) => {
  const forgot = new ForgotPasswordPage(page);
  await forgot.open();
  await forgot.requestLink(DAD.email);
  const link = await resetLinkFor(DAD.email);
  const reset = new ResetPasswordPage(page);
  await reset.openLink(link);
  await reset.choosePassword('a-fresh-password-7');
  await expect(reset.heading()).toHaveText('Password updated');

  await reset.openLink(link);
  await reset.choosePassword('another-password-8');

  await expect(reset.heading()).toHaveText('This link has expired');
  await reset.askForNewLink();
  await expect(forgot.heading()).toHaveText('Forgot your password?');
});

test('Given a reset link older than an hour, when Dad submits a new password, then he is told it has expired and nothing changes', async ({ page }) => {
  const forgot = new ForgotPasswordPage(page);
  await forgot.open();
  await forgot.requestLink(DAD.email);
  const link = await resetLinkFor(DAD.email);
  expireResetLinks();

  const reset = new ResetPasswordPage(page);
  await reset.openLink(link);
  await reset.choosePassword('a-fresh-password-7');

  await expect(reset.heading()).toHaveText('This link has expired');
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.signInWithPassword(DAD.username, DAD.password);
  await expect(page).toHaveURL(/\/review$/);
});

test('Given a short password that does not match, when Dad saves, then both boxes say what is wrong and nothing is sent', async ({ page }) => {
  const forgot = new ForgotPasswordPage(page);
  await forgot.open();
  await forgot.requestLink(DAD.email);
  const reset = new ResetPasswordPage(page);
  reset.watchRequests();
  await reset.openLink(await resetLinkFor(DAD.email));
  await reset.choosePassword('short', 'shorter');

  await expect(reset.problemSummary()).toContainText('Fix 2 things');
  await expect(reset.newPasswordField()).toHaveAccessibleDescription(/Use at least 8 characters\./);
  await expect(reset.confirmField()).toHaveAccessibleDescription(/These don’t match\. Type the same password in both boxes\./);
  expect(reset.requestCount()).toBe(0);
});

test('Given the server cannot be reached, when Dad asks for a link, then he is told the mail could not be sent, keeps his address and can try again', async ({ page }) => {
  const forgot = new ForgotPasswordPage(page);
  await forgot.open();
  await forgot.breakMail();
  await forgot.requestLink(DAD.email);

  await expect(forgot.failure()).toBeVisible();
  await expect(forgot.emailField()).toHaveValue(DAD.email);
  await forgot.repairMail();
  await forgot.tryAgain();

  await expect(forgot.confirmation()).toBeVisible();
});
