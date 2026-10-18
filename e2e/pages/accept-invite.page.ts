import type { Page } from '@playwright/test';

export class AcceptInvitePage {
  private requests = 0;

  constructor(private readonly page: Page) {
    page.on('request', (request) => {
      if (request.url().endsWith('/api/auth/accept-invite')) this.requests++;
    });
  }

  requestCount() {
    return this.requests;
  }

  async openLink(link: string) {
    await this.page.goto(link);
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  invitedBy() {
    return this.page.getByText(/invited you/);
  }

  emailField() {
    return this.page.getByLabel('E-mail address');
  }

  nameField() {
    return this.page.getByLabel('Your name');
  }

  usernameField() {
    return this.page.getByLabel('Username');
  }

  passwordField() {
    return this.page.getByRole('textbox', { name: 'Password', exact: true });
  }

  confirmField() {
    return this.page.getByRole('textbox', { name: 'Type it again' });
  }

  async join(account: { name: string; username: string; password: string; confirm?: string }) {
    await this.nameField().fill(account.name);
    await this.usernameField().fill(account.username);
    await this.passwordField().fill(account.password);
    await this.confirmField().fill(account.confirm ?? account.password);
    await this.page.getByRole('button', { name: 'Join the household' }).click();
  }

  problemSummary() {
    return this.page.getByRole('alert').filter({ hasText: /Fix \d+ things?/ });
  }

  async backToSignIn() {
    await this.page.getByRole('link', { name: 'Back to sign in' }).click();
  }
}
