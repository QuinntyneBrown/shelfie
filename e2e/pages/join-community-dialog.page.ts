import type { Page } from '@playwright/test';

/** Join with a code, over the Community page. */
export class JoinCommunityDialog {
  constructor(private readonly page: Page) {}

  dialog() {
    return this.page.getByRole('dialog', { name: 'Join with a code' });
  }

  async join(code: string, familyName: string) {
    await this.dialog().getByLabel('Join code').fill(code);
    await this.dialog().getByLabel('Your family’s name in this community').fill(familyName);
    await this.dialog().getByRole('button', { name: 'Join', exact: true }).click();
  }

  codeError() {
    return this.dialog().getByText(/No community has that code|is already in/);
  }

  async openCommunity() {
    await this.dialog().getByRole('button', { name: /^Open / }).click();
  }
}
