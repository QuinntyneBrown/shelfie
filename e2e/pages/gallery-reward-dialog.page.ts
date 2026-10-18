import type { Page } from '@playwright/test';

/** The Add a reward / Edit {name} dialog over Settings. */
export class GalleryRewardDialog {
  private requests = 0;

  constructor(private readonly page: Page) {
    page.on('request', (request) => {
      if (/\/api\/gallery-rewards(\/|$)/.test(request.url()) && request.method() !== 'GET') this.requests++;
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

  descriptionField() {
    return this.dialog().getByRole('textbox', { name: 'Description (optional)' });
  }

  targetField() {
    return this.dialog().getByRole('spinbutton', { name: 'Books to finish' });
  }

  async fill(reward: { name?: string; description?: string; target?: string }) {
    if (reward.name !== undefined) await this.nameField().fill(reward.name);
    if (reward.description !== undefined) await this.descriptionField().fill(reward.description);
    if (reward.target !== undefined) await this.targetField().fill(reward.target);
  }

  async save() {
    await this.dialog().getByRole('button', { name: /Add reward|Save changes/ }).click();
  }

  problemSummary() {
    return this.dialog().getByRole('alert').filter({ hasText: /Fix \d+ things?/ });
  }

  failure() {
    return this.dialog().getByRole('alert').filter({ hasText: 'wasn’t saved' });
  }

  async tryAgain() {
    await this.dialog().getByRole('button', { name: 'Try again' }).click();
  }

  async breakSaving() {
    await this.page.route('**/api/gallery-rewards**', (route) => (route.request().method() === 'GET' ? route.continue() : route.abort()));
  }

  async repairSaving() {
    await this.page.unroute('**/api/gallery-rewards**');
  }
}
