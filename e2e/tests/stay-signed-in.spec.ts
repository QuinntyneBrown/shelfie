// Traces to: L2-003
import { test, expect } from '../support/test';
import { SAME_SITE } from '../support/same-site';
import { signInAsNia } from '../support/signed-in';
import { NIA } from '../support/accounts';
import { ShelfPage } from '../pages/shelf.page';
import { ShellPage } from '../pages/shell.page';
import { SignInPage } from '../pages/sign-in.page';
import { expireSessions, sessionExpiresAt, shortenSessions } from '../support/database';

const DAY = 24 * 60 * 60;
const sessionCookie = async (page: Parameters<typeof signInAsNia>[0]) => (await page.context().cookies()).find((c) => c.name === 'shelfie_session')!;

test('Given Keep me signed in is on, when Nia signs in, then the session cookie outlives the browser by 30 days', async ({ page }) => {
  await signInAsNia(page);

  const cookie = await sessionCookie(page);
  expect(cookie.expires - Date.now() / 1000).toBeGreaterThan(29 * DAY);
  expect(cookie.expires - Date.now() / 1000).toBeLessThan(31 * DAY);
});

test('Given Keep me signed in is off, when Nia signs in, then the session cookie ends with the browser', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.signInWithPassword(NIA.username, NIA.password, { remember: false });
  await expect(page).toHaveURL(/\/shelf$/);

  expect((await sessionCookie(page)).expires).toBe(-1);
});

test('Given Nia signs out from her account menu, when she presses Back, then no shelf is shown', async ({ page }) => {
  await signInAsNia(page);
  const shell = new ShellPage(page);
  await expect(new ShelfPage(page).greeting()).toHaveText('Hi Nia');
  await shell.openAccountMenu('Nia');
  await shell.menuItem('Sign out').click();
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.goBack();

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(new ShelfPage(page).greeting()).toHaveText('Welcome back');
});

test('Given Nia is signed in, when the page is reloaded, then she is still signed in on the same page', async ({ page }) => {
  await signInAsNia(page);

  await page.reload();

  await expect(new ShelfPage(page).greeting()).toHaveText('Hi Nia');
});

for (const path of ['/shelf', '/review', '/books/b-lion/chapters/12/log']) {
  test(`Given nobody is signed in, when ${path} is opened, then the sign-in page is shown`, async ({ page }) => {
    await page.goto(path);

    await expect(page).toHaveURL(/\/sign-in$/);
  });
}

test('Given Nia’s session has expired, when she reloads, then the sign-in page says she was signed out', async ({ page }) => {
  await signInAsNia(page);
  await expect(new ShelfPage(page).book('On the go', 'The Wild Robot')).toBeVisible();
  await expireSessions();

  await page.reload();

  await expect(page).toHaveURL(/\/sign-in\?reason=expired$/);
  await expect(new SignInPage(page).signedOutNotice()).toBeVisible();
});

test('Given Nia’s session expires while the app is open, when she takes her next action, then she is sent to sign-in with the reason', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await expect(shelf.book('On the go', 'The Wild Robot')).toBeVisible();
  await expireSessions();

  await shelf.logChapter('On the go', 'The Wild Robot', 4);

  await expect(page).toHaveURL(/\/sign-in\?reason=expired$/);
  await expect(new SignInPage(page).signedOutNotice()).toBeVisible();
});

test('Given Nia is using the app, when a request is made, then her session runs 30 days from that request', async ({ page }) => {
  await signInAsNia(page);
  await expect(new ShelfPage(page).book('On the go', 'The Wild Robot')).toBeVisible();
  await shortenSessions();

  await page.request.get('/api/shelf');

  const daysLeft = (Date.parse(await sessionExpiresAt()) - Date.now()) / (24 * 60 * 60 * 1000);
  expect(daysLeft).toBeGreaterThan(29.9);
});

test('Given Nia is signed in, when she signs out, then the server ends the session', async ({ page }) => {
  await signInAsNia(page);
  await expect(new ShelfPage(page).book('On the go', 'The Wild Robot')).toBeVisible();

  const signOut = await page.request.post('/api/auth/sign-out', SAME_SITE);
  const afterwards = await page.request.get('/api/shelf');

  expect(signOut.status()).toBe(204);
  expect(afterwards.status()).toBe(401);
});

test('Given any API response, then the browser is told not to keep it', async ({ page }) => {
  await signInAsNia(page);

  const response = await page.request.get('/api/shelf');

  expect(response.headers()['cache-control']).toBe('no-store');
});
