import type { Page } from '@playwright/test';

/** The Set a reward / Edit the reward dialog for a streak milestone, over Settings. */
export class StreakRewardDialog {
  private requests = 0;

  constructor(private readonly page: Page) {
    page.on('request', (request) => {
      if (/\/api\/streak-rewards(\/|$)/.test(request.url()) && request.method() !== 'GET') this.requests++;
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
    return this.dialog().getByRole('textbox', { name: 'The reward' });
  }

  amountField() {
    return this.dialog().getByRole('spinbutton', { name: 'Amount in dollars (optional)' });
  }

  async fillAmount(amount: string) {
    await this.amountField().fill(amount);
  }

  async fill(name: string) {
    await this.nameField().fill(name);
  }

  async save() {
    await this.dialog().getByRole('button', { name: /Set reward|Save changes/ }).click();
  }

  failure() {
    return this.dialog().getByRole('alert').filter({ hasText: 'wasn’t saved' });
  }

  async tryAgain() {
    await this.dialog().getByRole('button', { name: 'Try again' }).click();
  }

  async breakSaving() {
    await this.page.route('**/api/streak-rewards**', (route) => (route.request().method() === 'GET' ? route.continue() : route.abort()));
  }

  async repairSaving() {
    await this.page.unroute('**/api/streak-rewards**');
  }
}
