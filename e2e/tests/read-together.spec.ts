// Traces to: L2-137, L2-138, L2-139, L2-140, L2-145
import { test, expect } from '../support/test';
import { signInAsNia, signInAsZoe } from '../support/signed-in';
import { addZoe } from '../support/database';
import { ShelfPage } from '../pages/shelf.page';
import { LogTogetherPage } from '../pages/log-together.page';

test('Given Nia and Zoe, when Nia logs that she read to Zoe for 20 minutes, then she celebrates and the session tops her Together card', async ({ page }) => {
  await addZoe();
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await shelf.readTogether();

  const together = new LogTogetherPage(page);
  await expect(together.heading()).toHaveText('Read together');
  await expect(together.partner('Zoe')).toHaveAttribute('aria-pressed', 'true');
  await expect(together.choice('What you did', 'I read to her')).toHaveAttribute('aria-pressed', 'true');
  await expect(together.choice('How long', '20 minutes')).toHaveAttribute('aria-pressed', 'true');
  await expect(together.choice('Day you read together', 'Today')).toHaveAttribute('aria-pressed', 'true');
  await together.done();

  await expect(together.celebration()).toHaveText('20 minutes together!');
  await together.backToShelf();
  await expect(shelf.togetherSessions().first()).toContainText('You read to Zoe · 20 minutes');
  await expect(shelf.togetherSessions().first()).toContainText('Today');
});

test('Given Nia helped Zoe read for 10 minutes yesterday, then her card says so', async ({ page }) => {
  await addZoe();
  await signInAsNia(page);
  const together = new LogTogetherPage(page);
  await together.open();

  await together.pickWhat('I helped her read');
  await together.pickMinutes('10 minutes');
  await together.pickDay('Yesterday');
  await together.done();
  await expect(together.celebration()).toHaveText('10 minutes together!');

  await together.backToShelf();
  const shelf = new ShelfPage(page);
  await expect(shelf.togetherSession('You helped Zoe read · 10 minutes')).toContainText('Yesterday');
});

test('Given another number of 200 minutes, when Nia chooses Done!, then it says to use 5 to 180 minutes and sends nothing', async ({ page }) => {
  await addZoe();
  await signInAsNia(page);
  const together = new LogTogetherPage(page);
  await together.open();

  await together.typeMinutes('200');
  await together.done();

  await expect(together.fieldError('Use 5 to 180 minutes.')).toBeVisible();
  await expect(together.problem('Fix 1 thing')).toBeVisible();
  expect(together.requestCount()).toBe(0);

  await together.typeMinutes('45');
  await together.done();
  await expect(together.celebration()).toHaveText('45 minutes together!');
});

test('Given the connection drops, when Nia chooses Done!, then it says it wasn’t saved, keeps her answers, and Try again works', async ({ page }) => {
  await addZoe();
  await signInAsNia(page);
  const together = new LogTogetherPage(page);
  await together.open();
  await together.pickMinutes('30 minutes');
  await together.breakSaving();

  await together.done();
  await expect(together.problem('That wasn’t saved')).toBeVisible();
  await expect(together.choice('How long', '30 minutes')).toHaveAttribute('aria-pressed', 'true');

  await together.repairSaving();
  await together.tryAgain();
  await expect(together.celebration()).toHaveText('30 minutes together!');
});

test('Given Nia has logged 10 sessions today, when she logs another, then it says that’s 10 for today', async ({ page }) => {
  await addZoe();
  await signInAsNia(page);
  for (let i = 0; i < 10; i++) {
    const response = await page.request.post('/api/together/sessions', {
      headers: { 'X-Requested-With': 'Shelfie' },
      data: { partnerId: 'p-zoe', kind: 'read-to', minutes: 10, readOn: new Date().toISOString().slice(0, 10) },
    });
    expect(response.status()).toBe(201);
  }
  const together = new LogTogetherPage(page);
  await together.open();

  await together.done();
  await expect(together.problem('That’s 10 for today. Log more tomorrow.')).toBeVisible();
});

test('Given a household with one reader, then her shelf has no Read together button and no Together section', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.group('On the go')).toBeVisible();
  await expect(shelf.readTogetherButton()).toHaveCount(0);
  await expect(shelf.together()).toHaveCount(0);
});

test('Given a phone, then Read together and the Together card stay within the screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await addZoe();
  await signInAsNia(page);
  const together = new LogTogetherPage(page);
  await together.open();
  await expect(together.partner('Zoe')).toBeVisible();
  expect(await together.scrollsSideways()).toBe(false);

  await together.done();
  await together.backToShelf();
  const shelf = new ShelfPage(page);
  await expect(shelf.together()).toBeVisible();
  expect(await shelf.scrollsSideways()).toBe(false);
});

/** Logs a session for whoever is signed in on the page, straight through the API. */
async function logViaApi(page: import('@playwright/test').Page, partnerId: string, kind: string, minutes: number) {
  const response = await page.request.post('/api/together/sessions', {
    headers: { 'X-Requested-With': 'Shelfie' },
    data: { partnerId, kind, minutes, readOn: new Date().toISOString().slice(0, 10) },
  });
  expect(response.status()).toBe(201);
}

test('Given Nia logged that she read to Zoe, when Zoe opens her shelf, then she sees it from her side and That’s right confirms it for both', async ({ page, browser }) => {
  await addZoe();
  await signInAsNia(page);
  await logViaApi(page, 'p-zoe', 'read-to', 20);

  const zoePage = await browser.newPage();
  await signInAsZoe(zoePage);
  const zoeShelf = new ShelfPage(zoePage);
  await expect(zoeShelf.togetherSession('Nia read to you · 20 minutes')).toContainText('Today · Nia logged it');

  await zoeShelf.confirmSession('Nia read to you · 20 minutes');
  await expect(zoeShelf.confirmButton('Nia read to you · 20 minutes')).toHaveCount(0);
  await expect(zoeShelf.togetherSession('Nia read to you · 20 minutes')).toContainText('you said that’s right');
  await expect(zoeShelf.togetherSessions()).toHaveCount(1);

  await page.reload();
  await expect(new ShelfPage(page).togetherSession('You read to Zoe · 20 minutes')).toContainText('Zoe says that’s right');
  await zoePage.close();
});

test('Given Zoe logged that Nia read to her, then Nia sees it with That’s right, and her own sessions have none', async ({ page, browser }) => {
  await addZoe();
  const zoePage = await browser.newPage();
  await signInAsZoe(zoePage);
  await logViaApi(zoePage, 'p-nia', 'read-to-me', 15);
  await zoePage.close();
  await signInAsNia(page);
  await logViaApi(page, 'p-zoe', 'helped', 10);
  await page.reload();
  const shelf = new ShelfPage(page);

  await expect(shelf.togetherSession('You read to Zoe · 15 minutes')).toContainText('Zoe logged it');
  await expect(shelf.confirmButton('You read to Zoe · 15 minutes')).toBeVisible();
  await expect(shelf.confirmButton('You helped Zoe read · 10 minutes')).toHaveCount(0);
});

test('Given the connection drops, when Zoe says That’s right, then a toast says it wasn’t saved and the button stays', async ({ page, browser }) => {
  await addZoe();
  await signInAsNia(page);
  await logViaApi(page, 'p-zoe', 'read-to', 20);
  const zoePage = await browser.newPage();
  await signInAsZoe(zoePage);
  const zoeShelf = new ShelfPage(zoePage);
  await zoeShelf.breakConfirming();

  await zoeShelf.confirmSession('Nia read to you · 20 minutes');
  await expect(zoeShelf.toast('That wasn’t saved')).toBeVisible();
  await expect(zoeShelf.confirmButton('Nia read to you · 20 minutes')).toBeVisible();
  await zoePage.close();
});
