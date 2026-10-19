import type { Page } from '@playwright/test';

/** The parent's directory of approved authors and volunteers (`/directory`). */
export class DirectoryPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/directory');
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  async showVolunteers() {
    await this.page.getByRole('button', { name: 'Volunteers' }).click();
  }

  async showAuthors() {
    await this.page.getByRole('button', { name: 'Authors' }).click();
  }

  /** The listed people's names, in order. */
  names() {
    return this.page.getByRole('main').getByRole('listitem').locator('.list__title');
  }

  person(name: string) {
    return this.page.getByRole('main').getByRole('listitem').filter({ hasText: name });
  }

  async view(name: string) {
    await this.page.getByRole('link', { name: `View ${name}` }).click();
  }

  noVettingNotice() {
    return this.page.getByRole('status').filter({ hasText: 'Shelfie doesn’t vet volunteers' });
  }

  emptyState(title: string) {
    return this.page.getByRole('heading', { name: title });
  }

  loadFailure() {
    return this.page.getByRole('heading', { name: 'The directory didn’t load' });
  }

  async tryAgain() {
    await this.page.getByRole('button', { name: 'Try again' }).click();
  }

  async breakDirectory() {
    await this.page.route('**/api/directory', (route) => route.abort());
  }

  async repairDirectory() {
    await this.page.unroute('**/api/directory');
  }

  /** The shell's navigation links, top bar or tab bar, whichever is visible. */
  navigation() {
    return this.page.getByRole('navigation', { name: /^Primary/ }).filter({ visible: true }).getByRole('link');
  }

  async chooseDirectoryTab() {
    await this.navigation().filter({ hasText: 'Directory' }).click();
  }
}
