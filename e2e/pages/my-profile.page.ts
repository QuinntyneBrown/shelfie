import type { Page } from '@playwright/test';

/** An author's or volunteer's own profile (`/me`). */
export class MyProfilePage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/me');
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  /** The navigation links the shell shows, top bar or tab bar, whichever is visible. */
  navigation() {
    return this.page.getByRole('navigation', { name: /^Primary/ }).filter({ visible: true }).getByRole('link');
  }
}
