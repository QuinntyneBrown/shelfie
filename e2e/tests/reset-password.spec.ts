// Traces to: L2-004
import { test, expect } from '../support/test';
import { DAD } from '../support/accounts';
import { clearMailbox, mailFor } from '../support/mailbox';
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
