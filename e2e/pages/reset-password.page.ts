import type { Page } from '@playwright/test';

export class ResetPasswordPage {
  constructor(private readonly page: Page) {}

  async openLink(link: string) {
    await this.page.goto(link);
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  forAddress() {
    return this.page.getByText(/^For .+\./);
  }

  async choosePassword(password: string, again = password) {
    await this.newPasswordField().fill(password);
    await this.page.getByRole('textbox', { name: 'Type it again' }).fill(again);
    await this.page.getByRole('button', { name: 'Save new password' }).click();
  }

  async saveNewPassword() {
    await this.page.getByRole('button', { name: 'Save new password' }).click();
  }

  async askForNewLink() {
    await this.page.getByRole('link', { name: 'Send a new link' }).click();
  }

  problemSummary() {
    return this.page.getByRole('alert').filter({ hasText: /Fix \d+ things?/ });
  }

  newPasswordField() {
    return this.page.getByRole('textbox', { name: 'New password' });
  }

  confirmField() {
    return this.page.getByRole('textbox', { name: 'Type it again' });
  }

  private requests = 0;

  watchRequests() {
    this.page.on('request', (request) => {
      if (request.url().endsWith('/api/auth/reset-password')) this.requests++;
    });
  }

  requestCount() {
    return this.requests;
  }

  async goToReview() {
    await this.page.getByRole('link', { name: 'Go to Review' }).click();
  }

  async goToMyProfile() {
    await this.page.getByRole('link', { name: 'Go to My profile' }).click();
  }
}
