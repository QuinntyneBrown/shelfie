import type { Page } from '@playwright/test';

/** The Forbidden, Not found and Something went wrong pages. */
export class ErrorPage {
  constructor(private readonly page: Page) {}

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  homeLink(name: 'Back to my shelf' | 'Go to Review') {
    return this.page.getByRole('link', { name });
  }

  async backToShelf() {
    await this.page.getByRole('link', { name: 'Back to my shelf' }).click();
  }

  async switchReader() {
    await this.page.getByRole('button', { name: 'Switch reader' }).click();
  }
}
