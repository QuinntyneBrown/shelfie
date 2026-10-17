import type { Page } from '@playwright/test';

export class SettingsPage {
  constructor(private readonly page: Page) {}

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  readerName() {
    return this.page.getByLabel('Name', { exact: true });
  }

  grownUpName() {
    return this.page.getByLabel('Name Nia sees');
  }

  email() {
    return this.page.getByLabel('E-mail address');
  }

  /** Asks the API for the settings, as a client that skips the page would. */
  getViaApi() {
    return this.page.request.get('/api/settings');
  }
}
