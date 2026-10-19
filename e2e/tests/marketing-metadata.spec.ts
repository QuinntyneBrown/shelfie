// Traces to: L2-132, L2-133
import { test, expect } from '../support/test';
import { MarketingPage } from '../pages/marketing.page';

test('Given the marketing page, then it carries its description, canonical, Open Graph and Twitter tags', async ({ page }) => {
  const marketing = new MarketingPage(page);
  await marketing.open();
  await expect(page).toHaveTitle('Shelfie — Every chapter, rewarded');
  expect(await marketing.meta('description')).toMatch(/reading/i);
  expect(await marketing.meta('theme-color')).toBeTruthy();
  expect(await marketing.canonical()).toBe('https://www.shelfie.kids/');
  expect(await marketing.meta('og:type')).toBe('website');
  expect(await marketing.meta('og:url')).toBe('https://www.shelfie.kids/');
  expect(await marketing.meta('og:title')).toBe('Shelfie — Every chapter, rewarded');
  expect(await marketing.meta('og:description')).toBeTruthy();
  expect(await marketing.meta('og:image')).toBe('https://www.shelfie.kids/assets/social-card.png');
  expect(await marketing.meta('og:image:width')).toBe('1200');
  expect(await marketing.meta('og:image:height')).toBe('630');
  expect(await marketing.meta('og:image:alt')).toBeTruthy();
  expect(await marketing.meta('twitter:card')).toBe('summary_large_image');
  expect(await marketing.meta('twitter:image:alt')).toBeTruthy();
  expect((await marketing.file('assets/social-card.png')).ok).toBe(true);
});

test('Given robots.txt and sitemap.xml, then search engines are let in and pointed at the page', async ({ page }) => {
  const marketing = new MarketingPage(page);
  const robots = await marketing.file('robots.txt');
  expect(robots.text).toContain('Allow: /');
  expect(robots.text).toContain('Sitemap: https://www.shelfie.kids/sitemap.xml');
  expect((await marketing.file('sitemap.xml')).text).toContain('<loc>https://www.shelfie.kids/</loc>');
});

test('Given the strict policy, when the page loads, then nothing is blocked and nothing leaves its origin', async ({ page, baseURL }) => {
  const violations: string[] = [];
  const offsite: string[] = [];
  page.on('console', (message) => message.text().includes('Content Security Policy') && violations.push(message.text()));
  page.on('request', (request) => !request.url().startsWith(baseURL!) && offsite.push(request.url()));
  const marketing = new MarketingPage(page);
  await marketing.open();
  await marketing.screenshotReport();
  expect(violations).toEqual([]);
  expect(offsite).toEqual([]);
});
