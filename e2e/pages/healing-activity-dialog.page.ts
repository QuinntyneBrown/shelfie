import type { Page } from '@playwright/test';

/** The Set a healing activity / Edit the healing activity dialog, over Settings. */
export class HealingActivityDialog {
  private requests = 0;

  constructor(private readonly page: Page) {
    page.on('request', (request) => {
      if (/\/api\/streak-healing(\/|$)/.test(request.url()) && request.method() !== 'GET') this.requests++;
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

  nameField() {
    return this.dialog().getByRole('textbox', { name: 'The activity' });
  }

  async fill(name: string) {
    await this.nameField().fill(name);
  }

  async save() {
    await this.dialog().getByRole('button', { name: /Set activity|Save changes/ }).click();
  }

  failure() {
    return this.dialog().getByRole('alert').filter({ hasText: 'wasn’t saved' });
  }

  async tryAgain() {
    await this.dialog().getByRole('button', { name: 'Try again' }).click();
  }

  async breakSaving() {
    await this.page.route('**/api/streak-healing/**', (route) => route.abort());
  }

  async repairSaving() {
    await this.page.unroute('**/api/streak-healing/**');
  }
}
