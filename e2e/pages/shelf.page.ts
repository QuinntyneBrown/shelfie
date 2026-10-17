import type { Page } from '@playwright/test';

export class ShelfPage {
  constructor(private readonly page: Page) {}

  greeting() {
    return this.page.getByRole('heading', { level: 1 });
  }
}
