// Traces to: L2-129
import { test, expect } from '../support/test';
import { MarketingPage } from '../pages/marketing.page';

test('Given a visitor opens the marketing page, then the hero headline and its calls to action point at the app', async ({ page }) => {
  const marketing = new MarketingPage(page);
  await marketing.open();
  await expect(marketing.heading()).toHaveText('Every chapter is a step to a reward.');
  await expect(marketing.startReading()).toHaveAttribute('href', 'https://app.shelfie.kids/sign-up');
  await expect(marketing.seeHowItWorks()).toHaveAttribute('href', '#how');
  await expect(marketing.headerOpenTheApp()).toHaveAttribute('href', 'https://app.shelfie.kids/sign-in');
});

test('Given the marketing page, then its sections tell the reading loop in order and end with calls to action', async ({ page }) => {
  const marketing = new MarketingPage(page);
  await marketing.open();
  await expect(marketing.sectionHeadings()).toHaveText([
    'Reading that feels like a game, not homework.',
    'Five small steps, one big finish.',
    'Real screens. Real encouragement.',
    'Made for the whole family.',
    'Their next chapter starts here.',
  ]);
  await expect(marketing.journeySteps()).toHaveCount(5);
  await expect(marketing.journeySteps().getByRole('heading')).toHaveText([
    'Read a chapter',
    'Log it',
    'Answer the questions',
    'A parent reviews',
    'A reward for finishing the book',
  ]);
  await expect(marketing.familyCards()).toHaveText([/streak/i, /badges/i, /reward gallery/i, /voice/i]);
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

test('Given the how-it-works section, then a narrated video of logging a chapter waits for the visitor to play it', async ({ page }) => {
  const marketing = new MarketingPage(page);
  await marketing.open();
  expect(await marketing.videoReport()).toEqual({
    name: expect.stringMatching(/log(s|ging)? a chapter/i),
    posterLoads: true,
    controls: true,
    paused: true,
    seconds: 88,
  });
});
