import type { Page } from '@playwright/test';

export class ForgotPasswordPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/forgot-password');
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  emailField() {
    return this.page.getByLabel('E-mail address');
  }

  async requestLink(email: string) {
    await this.emailField().fill(email);
    await this.page.getByRole('button', { name: 'Send reset link' }).click();
  }

  confirmation() {
    return this.page.getByRole('status').filter({ hasText: 'a reset link is on its way' });
  }
}
