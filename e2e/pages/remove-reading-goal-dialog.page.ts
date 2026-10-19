import type { Page } from '@playwright/test';

/** The confirmation before a reading goal is removed. */
export class RemoveReadingGoalDialog {
  constructor(private readonly page: Page) {}

  dialog() {
    return this.page.getByRole('dialog', { name: 'Remove the reading goal?' });
  }

  async confirm() {
    await this.dialog().getByRole('button', { name: 'Remove goal' }).click();
  }
}
