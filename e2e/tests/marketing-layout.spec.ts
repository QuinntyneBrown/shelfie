// Traces to: L2-115, L2-116
import { test, expect } from '../support/test';
import { MarketingPage } from '../pages/marketing.page';

for (const [width, height] of [[390, 844], [820, 1180], [1440, 900]]) {
  test(`Given a ${width}px wide screen, when the marketing page loads, then nothing scrolls sideways`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const marketing = new MarketingPage(page);
    await marketing.open();
    expect(await marketing.sidewaysScroll()).toBeLessThanOrEqual(0);
  });
}

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Given the closed menu, when its button is used from the keyboard, then it opens and Escape closes it again', async ({ page }) => {
    const marketing = new MarketingPage(page);
    await marketing.open();
    await expect(marketing.menuButton()).toHaveAccessibleName('Open navigation');
    await expect(marketing.menuButton()).toHaveAttribute('aria-controls', 'mobile-menu');
    await expect(marketing.menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(await marketing.isMenuInert()).toBe(true);

    await marketing.menuButton().focus();
    await page.keyboard.press('Enter');
    await expect(marketing.menuButton()).toHaveAttribute('aria-expanded', 'true');
    await expect(marketing.menuButton()).toHaveAccessibleName('Close navigation');
    expect(await marketing.isMenuInert()).toBe(false);
    await expect(marketing.mobileMenuLink('How it works')).toBeVisible();
    await expect(marketing.mobileMenuLink('Open the app')).toHaveAttribute('href', 'https://app.shelfie.kids/sign-in');

    await page.keyboard.press('Escape');
    await expect(marketing.menuButton()).toHaveAttribute('aria-expanded', 'false');
    await expect(marketing.menuButton()).toHaveAccessibleName('Open navigation');
    expect(await marketing.isMenuInert()).toBe(true);
  });

  test('Given the open menu, when a link is chosen, then the menu closes', async ({ page }) => {
    const marketing = new MarketingPage(page);
    await marketing.open();
    await marketing.menuButton().click();
    await marketing.mobileMenuLink('How it works').click();
    await expect(marketing.menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(await marketing.isMenuInert()).toBe(true);
  });
});

test('Given motion is allowed, then sections below the fold wait to rise into view', async ({ page }) => {
  const marketing = new MarketingPage(page);
  await marketing.open();
  expect((await marketing.revealed()).some((shown) => !shown)).toBe(true);
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('Given reduced motion is requested, when the page loads, then every section is shown at once', async ({ page }) => {
    const marketing = new MarketingPage(page);
    await marketing.open();
    const shown = await marketing.revealed();
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.every(Boolean)).toBe(true);
  });
});
