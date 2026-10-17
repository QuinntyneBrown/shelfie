import type { Page } from '@playwright/test';

/** The parts of the app that wrap every signed-in page: skip link, top bar and account menu. */
export class ShellPage {
  constructor(private readonly page: Page) {}

  skipLink() {
    return this.page.getByRole('link', { name: 'Skip to content' });
  }

  main() {
    return this.page.getByRole('main');
  }

  brand() {
    return this.page.getByRole('banner').getByRole('link', { name: 'Shelfie' });
  }

  accountMenuButton(name: string) {
    return this.page.getByRole('button', { name: `Account menu for ${name}` });
  }
}
