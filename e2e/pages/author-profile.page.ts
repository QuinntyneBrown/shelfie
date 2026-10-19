import type { Page } from '@playwright/test';

/** An approved author's profile and catalogue, as a parent sees it (`/directory/authors/:id`). */
export class AuthorProfilePage {
  constructor(private readonly page: Page) {}

  async open(id: string) {
    await this.page.goto(`/directory/authors/${id}`);
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  about() {
    return this.page.getByRole('main').getByText(/I write/);
  }

  website() {
    return this.page.getByRole('link', { name: /\.example\.com/ });
  }

  /** The catalogue's titles, in order. */
  bookTitles() {
    return this.page.getByRole('main').getByRole('listitem').locator('.list__title');
  }

  book(title: string) {
    return this.page.getByRole('main').getByRole('listitem').filter({ hasText: title });
  }

  noBooks() {
    return this.page.getByText(/hasn’t added any books yet/);
  }

  async addToShelf(title: string) {
    await this.page.getByRole('link', { name: `Add to shelf: ${title}` }).click();
  }

  notAvailable() {
    return this.page.getByRole('heading', { name: 'This profile isn’t available' });
  }

  async backToDirectory() {
    await this.page.getByRole('link', { name: 'Back to the directory' }).click();
  }
}
