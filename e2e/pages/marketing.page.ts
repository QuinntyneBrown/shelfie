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

  menuButton() {
    return this.page.locator('.site-header').getByRole('button', { name: /navigation/ });
  }

  mobileMenu() {
    return this.page.locator('#mobile-menu');
  }

  mobileMenuLink(name: string) {
    return this.mobileMenu().getByRole('link', { name });
  }

  /** The share of the screen's height the open menu covers, from 0 to 1. */
  async menuCoverage() {
    const box = await this.mobileMenu().boundingBox();
    return (box?.height ?? 0) / this.page.viewportSize()!.height;
  }

  isMenuInert() {
    return this.mobileMenu().evaluate((menu) => (menu as HTMLElement).inert);
  }

  /** How far the page scrolls sideways, in pixels. */
  sidewaysScroll() {
    return this.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  }

  /** The sections that animate in, with whether each is fully shown right now. */
  revealed() {
    return this.page.locator('[data-reveal]').evaluateAll((items) =>
      items.map((item) => getComputedStyle(item).opacity === '1' && getComputedStyle(item).transform === 'none'),
    );
  }

  /** The content of a <meta> tag, found by its name or property. */
  meta(key: string) {
    return this.page.locator(`meta[name="${key}"], meta[property="${key}"]`).first().getAttribute('content');
  }

  canonical() {
    return this.page.locator('link[rel="canonical"]').getAttribute('href');
  }

  async file(path: string) {
    const response = await this.page.request.get(`/marketing/${path}`);
    return { ok: response.ok(), text: await response.text() };
  }
}
