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
}
