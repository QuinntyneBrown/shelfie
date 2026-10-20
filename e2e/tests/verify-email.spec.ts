// Traces to: L2-144, L2-146, L2-147, L2-148, L2-149, L2-151
import { test, expect } from '../support/test';
import { mailFor, verifyLinkFor } from '../support/mailbox';
import { expireVerifyLinks } from '../support/database';
import { SignUpPage } from '../pages/sign-up.page';
import { VerifyEmailPage } from '../pages/verify-email.page';
import { OnboardingPage } from '../pages/onboarding.page';
import { SignInPage } from '../pages/sign-in.page';
import { ShellPage } from '../pages/shell.page';
import { ReviewPage } from '../pages/review.page';
import { signInAsDad, signInAsNia } from '../support/signed-in';

const MARCUS = { name: 'Marcus', email: 'marcus@example.com', username: 'marcus', password: 'reading-is-fun-9' };

async function signUpAsMarcus(page: import('@playwright/test').Page) {
  const signUp = new SignUpPage(page);
  await signUp.open();
  await signUp.fill(MARCUS);
  await signUp.submit();
  await expect(new OnboardingPage(page).heading()).toHaveText('Let’s set up Shelfie for your family');
}

test('Given a new parent signs up, then a branded confirm mail from Shelfie arrives with a plain-text part, and the wizard opens as before', async ({ page }) => {
  await signUpAsMarcus(page);

  await verifyLinkFor(MARCUS.email);
  const [mail] = mailFor(MARCUS.email);
  expect(mail.subject).toBe('Confirm your e-mail for Shelfie');
  expect(mail.text).toContain('The link works once, for 24 hours.');
  expect(mail.html).toContain('>Confirm my e-mail</a>');
});

test('Given the confirm link, when it is opened on a device that is not signed in, then the address is confirmed and nobody is signed in', async ({ page, browser, baseURL }) => {
  await signUpAsMarcus(page);
  const link = await verifyLinkFor(MARCUS.email);

  const elsewhere = await browser.newContext({ baseURL });
  const other = await elsewhere.newPage();
  const verify = new VerifyEmailPage(other);
  await verify.openLink(link);

  await expect(verify.heading()).toHaveText('Your e-mail is confirmed');
  await expect(verify.message()).toContainText(`${MARCUS.email} is all set`);
  expect((await other.request.get('/api/auth/session')).status()).toBe(401);
  await verify.goToShelfie();
  await expect(new SignInPage(other).heading()).toBeVisible();
  await expect(other).toHaveURL(/\/sign-in$/);
  await elsewhere.close();
});

test('Given a confirm link that was already used, when it is opened again on a device that is not signed in, then it has expired and offers Sign in', async ({ page, browser, baseURL }) => {
  await signUpAsMarcus(page);
  const link = await verifyLinkFor(MARCUS.email);
  const elsewhere = await browser.newContext({ baseURL });
  const verify = new VerifyEmailPage(await elsewhere.newPage());
  await verify.openLink(link);
  await expect(verify.heading()).toHaveText('Your e-mail is confirmed');

  await verify.openLink(link);

  await expect(verify.heading()).toHaveText('This link has expired');
  await expect(verify.message()).toContainText('Confirmation links work once, for 24 hours');
  await expect(verify.signInLink()).toBeVisible();
  await elsewhere.close();
});

test('Given a confirm link older than a day, when the signed-in parent opens it, then it has expired and does not offer Sign in', async ({ page }) => {
  await signUpAsMarcus(page);
  const link = await verifyLinkFor(MARCUS.email);
  await expireVerifyLinks();

  const verify = new VerifyEmailPage(page);
  await verify.openLink(link);

  await expect(verify.heading()).toHaveText('This link has expired');
  await expect(verify.signInLink()).toHaveCount(0);
});

test('Given a new parent has not confirmed yet, then the banner shows on Review but not in the wizard, and Send it again mails a link that confirms and clears it', async ({ page }) => {
  await signUpAsMarcus(page);
  const shell = new ShellPage(page);
  await expect(shell.verifyEmailBanner()).toHaveCount(0);
  const first = await verifyLinkFor(MARCUS.email);
  await new OnboardingPage(page).skipForNow();
  await expect(page).toHaveURL(/\/review$/);

  await expect(shell.verifyEmailBanner()).toContainText(`We sent a link to ${MARCUS.email}. Open it to confirm the address is yours.`);
  await shell.sendVerifyLinkAgain();
  await expect(shell.toast('Sent. Check your inbox.')).toBeVisible();
  await expect.poll(() => mailFor(MARCUS.email).length).toBe(2);
  const second = await verifyLinkFor(MARCUS.email);
  expect(second).not.toBe(first);

  const verify = new VerifyEmailPage(page);
  await verify.openLink(first);
  await expect(verify.heading()).toHaveText('This link has expired');
  await verify.openLink(second);
  await expect(verify.heading()).toHaveText('Your e-mail is confirmed');
  await verify.goToShelfie();
  await expect(page).toHaveURL(/\/review$/);
  await expect(new ReviewPage(page).heading()).toBeVisible();
  await expect(shell.verifyEmailBanner()).toHaveCount(0);
});

test('Given a parent has asked for three links in ten minutes, when they press Send it again, then nothing is sent and they are told so', async ({ page }) => {
  await signUpAsMarcus(page);
  await new OnboardingPage(page).skipForNow();
  const shell = new ShellPage(page);
  for (let sent = 2; sent <= 4; sent++) {
    await shell.sendVerifyLinkAgain();
    await expect.poll(() => mailFor(MARCUS.email).length).toBe(sent);
  }

  await shell.sendVerifyLinkAgain();

  await expect(shell.toast('That’s a few links already')).toBeVisible();
  expect(mailFor(MARCUS.email).length).toBe(4);
});

test('Given the signed-in parent opens an expired link, when they press Send a new link, then a fresh link is mailed', async ({ page }) => {
  await signUpAsMarcus(page);
  const link = await verifyLinkFor(MARCUS.email);
  await expireVerifyLinks();
  const verify = new VerifyEmailPage(page);
  await verify.openLink(link);
  await expect(verify.heading()).toHaveText('This link has expired');
  await expect(new ShellPage(page).verifyEmailBanner()).toHaveCount(0);

  await verify.sendNewLink();

  await expect(new ShellPage(page).toast('Sent. Check your inbox.')).toBeVisible();
  await expect.poll(() => mailFor(MARCUS.email).length).toBe(2);
});

test('Given a parent from before this release or a reader, when they sign in, then the banner never shows', async ({ page, browser, baseURL }) => {
  await signInAsDad(page);
  await expect(new ReviewPage(page).heading()).toBeVisible();
  await expect(new ShellPage(page).verifyEmailBanner()).toHaveCount(0);

  const elsewhere = await browser.newContext({ baseURL });
  const nia = await elsewhere.newPage();
  await signInAsNia(nia);
  await expect(new ShellPage(nia).verifyEmailBanner()).toHaveCount(0);
  await elsewhere.close();
});
