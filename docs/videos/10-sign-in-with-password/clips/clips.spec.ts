import { test } from '../../../../tools/video-record/test';
import { DAD } from '../../../../e2e/support/accounts';
import { rememberDevice } from '../../../../e2e/support/remember-device';
import { SignInPage } from '../../../../e2e/pages/sign-in.page';
import { ReviewPage } from '../../../../e2e/pages/review.page';

// Paced to the narration in script.md: Welcome back, a wrong password, then the right one and Review.
test('first-sign-in', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await page.waitForTimeout(6000);
  await signIn.emailField().pressSequentially(DAD.email, { delay: 100 });
  await page.waitForTimeout(1000);
  await signIn.passwordField().pressSequentially('sunny-days-24', { delay: 100 });
  await page.waitForTimeout(1500);
  await signIn.signInButton().hover();
  await signIn.pressSignIn();
  await signIn.failureSummary().waitFor();
  await page.waitForTimeout(10000);
  await signIn.passwordField().fill('');
  await signIn.passwordField().pressSequentially(DAD.password, { delay: 100 });
  await page.waitForTimeout(1000);
  await signIn.signInButton().hover();
  await signIn.pressSignIn();
  await new ReviewPage(page).heading().waitFor();
  await page.waitForTimeout(10000);
});

// Paced to the narration: the browser knows Dad, so he picks his name and types only the password.
test('returning-sign-in', async ({ page }) => {
  await rememberDevice(page.context());
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.pickerHeading().waitFor();
  await page.waitForTimeout(3000);
  await signIn.chooseGrownUp('Dad');
  await signIn.signingInAs().hover();
  await page.waitForTimeout(3000);
  await signIn.passwordField().pressSequentially(DAD.password, { delay: 100 });
  await page.waitForTimeout(1000);
  await signIn.signInButton().hover();
  await signIn.pressSignIn();
  await new ReviewPage(page).heading().waitFor();
  await page.waitForTimeout(4000);
});
