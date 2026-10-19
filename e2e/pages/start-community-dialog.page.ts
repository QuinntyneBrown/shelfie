import type { Page } from '@playwright/test';

/** Start a community, over the Community page. */
export class StartCommunityDialog {
  constructor(private readonly page: Page) {}

  dialog() {
    return this.page.getByRole('dialog', { name: 'Start a community' });
  }

  async start(name: string, familyName: string) {
    await this.dialog().getByLabel('Community name').fill(name);
    await this.dialog().getByLabel('Your family’s name in this community').fill(familyName);
    await this.dialog().getByRole('button', { name: 'Start community' }).click();
  }

  problemSummary() {
    return this.dialog().getByText(/^Fix \d thing/);
  }

  nameError() {
    return this.dialog().getByText('Give your community a name.');
  }
}
