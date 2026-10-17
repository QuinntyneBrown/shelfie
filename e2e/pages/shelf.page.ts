import type { Page } from '@playwright/test';

export class ShelfPage {
  constructor(private readonly page: Page) {}

  greeting() {
    return this.page.getByRole('heading', { level: 1 });
  }

  group(name: 'On the go' | 'Up next' | 'Finished') {
    return this.page.getByRole('region', { name });
  }

  book(group: 'On the go' | 'Up next', title: string) {
    return this.group(group).getByRole('article').filter({ hasText: title });
  }

  async logChapter(group: 'On the go' | 'Up next', title: string, chapter: number) {
    await this.book(group, title).getByRole('link', { name: new RegExp(`Chapter ${chapter}\$`) }).click();
  }

  finishedBook(title: string) {
    return this.group('Finished').getByRole('listitem').filter({ hasText: title });
  }

  emptyTitle() {
    return this.page.getByRole('heading', { name: 'Your shelf is empty' });
  }

  askAGrownUp() {
    return this.page.getByText(/Ask a grown-up to add/);
  }

  loading() {
    return this.page.getByRole('region', { name: 'Loading your shelf' });
  }

  loadError() {
    return this.page.getByRole('heading', { name: 'Your shelf didn’t load' });
  }

  async tryAgain() {
    await this.page.getByRole('button', { name: 'Try again' }).click();
  }

  /** Holds the shelf response until the returned function is called. */
  async holdShelfResponse() {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await this.page.route('**/api/shelf', async (route) => {
      await gate;
      await route.continue();
    });
    return release;
  }

  async breakShelfRequests() {
    await this.page.route('**/api/shelf', (route) => route.abort());
  }

  async repairShelfRequests() {
    await this.page.unroute('**/api/shelf');
  }

  /** Number of columns the first grid on the page lays out. */
  async columns() {
    return this.page
      .locator('.grid')
      .first()
      .evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length);
  }

  async scrollsSideways() {
    return this.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  }

  async cardOverflows(group: 'On the go' | 'Up next', title: string) {
    return this.book(group, title).evaluate((card) => card.scrollWidth > card.clientWidth);
  }

  cover(group: 'On the go' | 'Up next', title: string) {
    return this.book(group, title).locator('.cover');
  }
}
