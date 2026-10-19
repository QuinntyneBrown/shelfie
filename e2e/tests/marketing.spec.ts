// Traces to: L2-129
import { test, expect } from '../support/test';
import { MarketingPage } from '../pages/marketing.page';

test('Given a visitor opens the marketing page, then the hero headline and its calls to action point at the app', async ({ page }) => {
  const marketing = new MarketingPage(page);
  await marketing.open();
  await expect(marketing.heading()).toHaveText('Every chapter, rewarded.');
  await expect(marketing.startReading()).toHaveAttribute('href', 'https://app.shelfie.kids/sign-up');
  await expect(marketing.seeHowItWorks()).toHaveAttribute('href', '#how');
  await expect(marketing.headerOpenTheApp()).toHaveAttribute('href', 'https://app.shelfie.kids/sign-in');
});

test('Given the marketing page, then its sections tell the reading loop in order and end with calls to action', async ({ page }) => {
  const marketing = new MarketingPage(page);
  await marketing.open();
  await expect(marketing.sectionHeadings()).toHaveText([
    'Fun, not homework.',
    'Three steps, one finish.',
    'Real screens. Real encouragement.',
    'For the whole family.',
    'Start her next chapter.',
  ]);
  await expect(marketing.journeySteps()).toHaveCount(3);
  await expect(marketing.journeySteps().getByRole('heading')).toHaveText(['Read and log', 'Answer Olive’s questions', 'Stickers and a reward']);
  await expect(marketing.familyCards()).toHaveText([/streak/i, /badges/i, /reward gallery/i, /speak/i]);
  await expect(marketing.finalLink('Create a parent account')).toHaveAttribute('href', 'https://app.shelfie.kids/sign-up');
  await expect(marketing.finalLink('Sign in')).toHaveAttribute('href', 'https://app.shelfie.kids/sign-in');
});

test('Given the inside-the-app gallery, then every screenshot loads, is described and keeps its shape', async ({ page }) => {
  const marketing = new MarketingPage(page);
  await marketing.open();
  const report = await marketing.screenshotReport();
  expect(report.length).toBeGreaterThanOrEqual(4);
  for (const shot of report) expect(shot).toEqual({ alt: expect.stringMatching(/.{20,}/), loaded: true, distorted: false });
});

test('Given the footer, then it links to the app, shows this year and carries no project links', async ({ page }) => {
  const marketing = new MarketingPage(page);
  await marketing.open();
  await expect(marketing.footerLink('Open the app')).toHaveAttribute('href', 'https://app.shelfie.kids/sign-in');
  await expect(marketing.footerLink('GitHub')).toHaveCount(0);
  await expect(marketing.footerLink('Documentation')).toHaveCount(0);
  await expect(marketing.footerLink('License')).toHaveCount(0);
  await expect(marketing.footerYear()).toHaveText(String(new Date().getFullYear()));
});
