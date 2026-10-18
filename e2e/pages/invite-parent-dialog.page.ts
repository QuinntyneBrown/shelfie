import type { Page } from '@playwright/test';

/** The Invite a parent dialog over Settings. */
export class InviteParentDialog {
  private requests = 0;

  constructor(private readonly page: Page) {
    page.on('request', (request) => {
      if (request.url().endsWith('/api/invites') && request.method() === 'POST') this.requests++;
    });
  }

  requestCount() {
    return this.requests;
  }

  dialog() {
    return this.page.getByRole('dialog');
  }

  heading() {
    return this.dialog().getByRole('heading', { level: 2 });
  }

  emailField() {
    return this.dialog().getByLabel('Their e-mail address');
  }

  async send(email: string) {
    await this.emailField().fill(email);
    await this.dialog().getByRole('button', { name: 'Send invite' }).click();
  }

  confirmation() {
    return this.dialog().getByText(/We e-mailed/);
  }

  async done() {
    await this.dialog().getByRole('button', { name: 'Done' }).click();
  }

  problemSummary() {
    return this.dialog().getByRole('alert').filter({ hasText: /Fix \d+ things?/ });
  }

  failure() {
    return this.dialog().getByRole('alert').filter({ hasText: 'The invite wasn’t sent' });
  }

  async tryAgain() {
    await this.dialog().getByRole('button', { name: 'Try again' }).click();
  }

  async breakSending() {
    await this.page.route('**/api/invites', (route) => route.abort());
  }

  async repairSending() {
    await this.page.unroute('**/api/invites');
  }
}
