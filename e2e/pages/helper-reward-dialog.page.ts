import type { Page } from '@playwright/test';

/** The Set / Edit the helper reward dialog, over Settings. */
export class HelperRewardDialog {
  private requests = 0;

  constructor(private readonly page: Page) {
    page.on('request', (request) => {
      if (/\/api\/helper-reward(\/|$)/.test(request.url()) && request.method() !== 'GET') this.requests++;
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

  minutesField() {
    return this.dialog().getByRole('spinbutton', { name: 'Minutes to earn it' });
  }

  async fill(name: string, minutes: string) {
    await this.nameField().fill(name);
    await this.minutesField().fill(minutes);
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
    await this.page.route('**/api/helper-reward**', (route) => (route.request().method() === 'GET' ? route.continue() : route.abort()));
  }

  async repairSaving() {
    await this.page.unroute('**/api/helper-reward**');
  }
}
