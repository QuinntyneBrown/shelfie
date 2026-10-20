import type { Page } from '@playwright/test';

/** The Confirm your e-mail page that the mailed link opens. */
export class VerifyEmailPage {
  constructor(private readonly page: Page) {}

  async openLink(link: string) {
    await this.page.goto(link);
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  message() {
    return this.page.locator('main p');
  }

  async goToShelfie() {
    await this.page.getByRole('link', { name: 'Go to Shelfie' }).click();
  }

  signInLink() {
    return this.page.getByRole('link', { name: 'Sign in' });
  }

  sendNewLinkButton() {
    return this.page.getByRole('button', { name: 'Send a new link' });
  }

  async sendNewLink() {
    await this.sendNewLinkButton().click();
  }
}
