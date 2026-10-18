import type { Page } from '@playwright/test';

/** The Remove "{name}"? confirmation over Settings. */
export class RemoveGalleryRewardDialog {
  constructor(private readonly page: Page) {}

  dialog() {
    return this.page.getByRole('dialog');
  }

  heading() {
    return this.dialog().getByRole('heading', { level: 2 });
  }

  keepButton() {
    return this.dialog().getByRole('button', { name: 'Keep it' });
  }

  async confirm() {
    await this.dialog().getByRole('button', { name: 'Remove reward' }).click();
  }

  failure() {
    return this.dialog().getByRole('alert').filter({ hasText: 'The reward wasn’t removed' });
  }

  async breakRemoving() {
    await this.page.route('**/api/gallery-rewards/*', (route) => (route.request().method() === 'DELETE' ? route.abort() : route.continue()));
  }
}
