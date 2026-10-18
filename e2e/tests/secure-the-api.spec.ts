// Traces to: L2-027, L2-028
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { SAME_SITE } from '../support/same-site';
import { DAD, NIA } from '../support/accounts';
import { SignInPage } from '../pages/sign-in.page';
import { ShelfPage } from '../pages/shelf.page';
import { LogChapterPage } from '../pages/log-chapter.page';
import { BookPage } from '../pages/book.page';
import { ChapterPage } from '../pages/chapter.page';

test('Given any API response, then it carries a content security policy, nosniff, frame-ancestors and HSTS', async ({ page }) => {
  await signInAsNia(page);

  const headers = (await page.request.get('/api/shelf')).headers();

  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['strict-transport-security']).toContain('max-age=31536000');
});

test('Given a state-changing request that did not come from the app, then it is refused, while reads still work', async ({ page }) => {
  await signInAsNia(page);
  const answers = { readOn: '2026-01-01', answers: [{ position: 1, text: 'x' }] };

  const noHeader = await page.request.post('/api/books/b-lion/chapters/12', { data: answers });
  const foreignOrigin = await page.request.post('/api/books/b-lion/chapters/12', {
    data: answers,
    headers: { 'X-Requested-With': 'Shelfie', Origin: 'https://evil.example' },
  });
  const crossSite = await page.request.post('/api/books/b-lion/chapters/12', {
    data: answers,
    headers: { 'X-Requested-With': 'Shelfie', 'Sec-Fetch-Site': 'cross-site' },
  });

  for (const response of [noHeader, foreignOrigin, crossSite]) {
    expect([response.status(), (await response.json()).type]).toEqual([403, 'cross-site']);
  }
  expect((await page.request.get('/api/shelf')).status()).toBe(200);
});

test('Given ten password sign-ins in ten minutes, when an eleventh comes, then it is answered 429 and the page says to wait', async ({ page }) => {
  for (let attempt = 1; attempt <= 10; attempt++) {
    const response = await page.request.post('/api/auth/password', { ...SAME_SITE, data: { username: DAD.username, password: 'wrong-guess', remember: true } });
    expect(response.status()).toBe(401);
  }

  const eleventh = await page.request.post('/api/auth/password', { ...SAME_SITE, data: { username: DAD.username, password: DAD.password, remember: true } });
  expect(eleventh.status()).toBe(429);
  expect(Number(eleventh.headers()['retry-after'])).toBeGreaterThan(0);

  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.signInWithPassword(DAD.username, DAD.password);
  await expect(signIn.failureSummary()).toContainText('Too many tries. Wait 10 minutes and try again.');
});

test('Given a request body over 16 kB, then it is refused with 413', async ({ page }) => {
  await signInAsNia(page);

  const response = await page.request.post('/api/books', {
    ...SAME_SITE,
    data: { title: 'x'.repeat(17 * 1024), chapterCount: 3, coverColor: 'sage', sticker: '🦁' },
  });

  expect(response.status()).toBe(413);
  expect(await response.text()).not.toContain('PayloadTooLargeError');
});

test('Given invalid input, then the API answers 400 naming each field that is wrong', async ({ page }) => {
  await signInAsNia(page);

  const book = await page.request.post('/api/books', { ...SAME_SITE, data: { title: '', chapterCount: 0, coverColor: 'plaid', sticker: '🦁' } });

  expect(book.status()).toBe(400);
  const fields = ((await book.json()).errors as { field: string }[]).map((e) => e.field);
  expect(fields).toEqual(expect.arrayContaining(['title', 'chapterCount', 'coverColor']));
});

test('Given an answer with markup in it, when it is shown, then it appears as text and never runs', async ({ page }) => {
  // Traces to: L2-028
  const script = '<img src=x onerror="window.hacked=1"><script>window.hacked=1</script><b>bold</b>';
  await signInAsNia(page);
  await new ShelfPage(page).logChapter('On the go', 'The Lion, the Witch and the Wardrobe', 12);
  const log = new LogChapterPage(page);
  await log.answer(1, script);
  await log.done();
  await expect(log.heading()).toHaveText('Chapter 12 done!');

  await page.goto('/book/b-lion');
  await new BookPage(page).openChapterRow(12);
  await expect(new ChapterPage(page).answer(1)).toContainText(script);
  expect(await page.evaluate(() => (window as unknown as { hacked?: number }).hacked)).toBeUndefined();
});

test('Given someone signs in on a browser that already had a session, then the old session no longer works', async ({ page }) => {
  // Traces to: L2-027
  const firstSignIn = await page.request.post('/api/auth/password', { ...SAME_SITE, data: { username: DAD.username, password: DAD.password, remember: true } });
  expect(firstSignIn.ok()).toBe(true);
  const sessionCookie = async () => (await page.context().cookies()).find((c) => c.name === 'shelfie_session')!;
  const first = await sessionCookie();

  const secondSignIn = await page.request.post('/api/auth/password', { ...SAME_SITE, data: { username: NIA.username, password: NIA.password, remember: true } });
  expect(secondSignIn.ok()).toBe(true);
  const second = await sessionCookie();
  expect(second.value).not.toBe(first.value);
  expect(second.httpOnly && second.secure && second.sameSite === 'Strict').toBe(true);

  await page.context().addCookies([{ ...first }]);
  expect((await page.request.get('/api/auth/session')).status()).toBe(401);
});
