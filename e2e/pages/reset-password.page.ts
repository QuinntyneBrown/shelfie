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
    await this.page.getByLabel('New password').fill(password);
    await this.page.getByLabel('Type it again').fill(again);
    await this.page.getByRole('button', { name: 'Save new password' }).click();
  }

  async goToReview() {
    await this.page.getByRole('link', { name: 'Go to Review' }).click();
  }
}
