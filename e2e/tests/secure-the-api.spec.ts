// Traces to: L2-027, L2-028
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { SAME_SITE } from '../support/same-site';
import { DAD } from '../support/accounts';
import { SignInPage } from '../pages/sign-in.page';

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
    const response = await page.request.post('/api/auth/password', { ...SAME_SITE, data: { email: DAD.email, password: 'wrong-guess' } });
    expect(response.status()).toBe(401);
  }

  const eleventh = await page.request.post('/api/auth/password', { ...SAME_SITE, data: DAD });
  expect(eleventh.status()).toBe(429);
  expect(Number(eleventh.headers()['retry-after'])).toBeGreaterThan(0);

  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.signInWithPassword(DAD.email, DAD.password);
  await expect(signIn.failureSummary()).toContainText('Too many tries. Wait 10 minutes and try again.');
});
