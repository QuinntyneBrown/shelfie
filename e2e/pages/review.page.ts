import type { Page } from '@playwright/test';

export class ReviewPage {
  constructor(private readonly page: Page) {}

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }
}
