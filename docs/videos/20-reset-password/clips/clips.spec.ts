import { test, expect } from '../../../../tools/video-record/test';
import { DAD } from '../../../../e2e/support/accounts';
import { clearMailbox, resetLinkFor } from '../../../../e2e/support/mailbox';
import { SignInPage } from '../../../../e2e/pages/sign-in.page';
import { ForgotPasswordPage } from '../../../../e2e/pages/forgot-password.page';
import { ResetPasswordPage } from '../../../../e2e/pages/reset-password.page';

// Paced to the narration in script.md: ask for a link, the same message for any address,
// open the link from the local mailbox, choose a new password, Password updated, Go to Review.
test('reset-password', async ({ page }) => {
  await clearMailbox();
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.passwordField().waitFor();
  await page.waitForTimeout(2500);
  await signIn.chooseForgotPassword();

  const forgot = new ForgotPasswordPage(page);
  await forgot.heading().waitFor();
  await page.waitForTimeout(1500);
  await forgot.emailField().pressSequentially(DAD.email, { delay: 100 });
  await page.waitForTimeout(1500);
  await forgot.sendLink();
  await forgot.confirmation().waitFor();
  await page.waitForTimeout(12000);

  const link = await resetLinkFor(DAD.email);
  const reset = new ResetPasswordPage(page);
  await reset.openLink(link);
  await reset.newPasswordField().waitFor();
  await page.waitForTimeout(6000);
  await reset.newPasswordField().pressSequentially('a-fresh-password-7', { delay: 80 });
  await reset.confirmField().pressSequentially('a-fresh-password-7', { delay: 80 });
  await page.waitForTimeout(1000);
  await reset.saveNewPassword();
  await expect(reset.heading()).toHaveText('Password updated');
  await page.waitForTimeout(8000);
  await reset.goToReview();
  await page.waitForURL('**/review');
  await page.waitForTimeout(3000);
});
