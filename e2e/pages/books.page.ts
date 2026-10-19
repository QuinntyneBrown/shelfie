import type { Page } from '@playwright/test';

/** The grown-up's list of every book in the household. */
export class BooksPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/books');
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  row(title: string) {
    return this.page.getByRole('listitem').filter({ hasText: title });
  }

  coverPicture(title: string) {
    return this.row(title).locator('.cover img');
  }

  async manage(title: string) {
    await this.row(title).getByRole('link', { name: 'Manage' }).click();
  }

  addBookLink() {
    return this.page.getByRole('link', { name: 'Add a book' }).first();
  }

  emptyState() {
    return this.page.getByRole('heading', { name: 'Nia’s shelf is empty' });
  }

  /** Asks the API for the list, as a client that skips the page would. */
  getViaApi() {
    return this.page.request.get('/api/books');
  }
}
