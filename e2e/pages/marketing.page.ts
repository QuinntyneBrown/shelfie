import type { Page } from '@playwright/test';

export class MarketingPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/marketing/');
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  startReading() {
    return this.page.locator('.hero').getByRole('link', { name: 'Start reading free' });
  }

  seeHowItWorks() {
    return this.page.locator('.hero').getByRole('link', { name: /See how it works/ });
  }

  headerOpenTheApp() {
    return this.page.locator('.site-header .nav-cta');
  }

  /** The level-2 headings of the page's sections, in order. */
  sectionHeadings() {
    return this.page.getByRole('main').getByRole('heading', { level: 2 });
  }

  journeySteps() {
    return this.page.locator('#how').getByRole('listitem');
  }

  familyCards() {
    return this.page.locator('#families').getByRole('heading', { level: 3 });
  }

  finalLink(name: string) {
    return this.page.locator('.final-cta').getByRole('link', { name });
  }

  footerLink(name: string) {
    return this.page.getByRole('contentinfo').getByRole('link', { name });
  }

  footerYear() {
    return this.page.getByRole('contentinfo').locator('[data-year]');
  }

  screenshots() {
    return this.page.locator('#screens img');
  }

  /** Brings every screenshot into view, then reports how each one loaded and is drawn. */
  async screenshotReport() {
    const shots = this.screenshots();
    for (const shot of await shots.all()) await shot.scrollIntoViewIfNeeded();
    await this.page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>('#screens img')].every((i) => i.complete));
    return shots.evaluateAll((images) =>
      (images as HTMLImageElement[]).map((i) => ({
        alt: i.alt,
        loaded: i.naturalWidth > 0,
        distorted: Math.abs(i.naturalWidth / i.naturalHeight - i.clientWidth / i.clientHeight) > 0.01,
      })),
    );
  }
}
