// Traces to: L2-027, L2-028
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';

test('Given any API response, then it carries a content security policy, nosniff, frame-ancestors and HSTS', async ({ page }) => {
  await signInAsNia(page);

  const headers = (await page.request.get('/api/shelf')).headers();

  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['strict-transport-security']).toContain('max-age=31536000');
});
