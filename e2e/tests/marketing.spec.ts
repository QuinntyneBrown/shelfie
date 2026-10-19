// Traces to: L2-114
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
