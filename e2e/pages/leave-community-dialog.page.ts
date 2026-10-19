import type { Page } from '@playwright/test';

/** The confirmation before a household leaves a community. */
export class LeaveCommunityDialog {
  constructor(private readonly page: Page) {}

  dialog() {
    return this.page.getByRole('dialog', { name: /^Leave .*\?$/ });
  }

  async confirm() {
    await this.dialog().getByRole('button', { name: 'Leave community' }).click();
  }

  async stay() {
    await this.dialog().getByRole('button', { name: 'Stay' }).click();
  }
}
