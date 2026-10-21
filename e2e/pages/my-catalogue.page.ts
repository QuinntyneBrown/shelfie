import type { Page } from '@playwright/test';

/** An author's catalogue (`/catalogue`) and its Remove a catalogue book confirmation. */
export class MyCataloguePage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/catalogue');
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  emptyState() {
    return this.page.getByRole('heading', { name: 'Your catalogue is empty' });
  }

  /** The books' titles, in order. */
  titles() {
    return this.page.getByRole('main').getByRole('listitem').locator('.list__title');
  }

  book(title: string) {
    return this.page.getByRole('main').getByRole('listitem').filter({ hasText: title });
  }

  /** The cover picture of a book's row, when it has one. */
  coverPicture(title: string) {
    return this.book(title).locator('img');
  }

  async addBook() {
    await this.page.getByRole('main').getByRole('button', { name: 'Add a book' }).first().click();
  }

  async edit(title: string) {
    await this.page.getByRole('button', { name: `Edit ${title}` }).click();
  }

  async remove(title: string) {
    await this.page.getByRole('button', { name: `Remove ${title}` }).click();
  }

  removeDialog() {
    return this.page.getByRole('dialog', { name: /^Remove “/ });
  }

  async confirmRemove() {
    await this.removeDialog().getByRole('button', { name: 'Remove book' }).click();
  }

  keepItButton() {
    return this.removeDialog().getByRole('button', { name: 'Keep it' });
  }

  toast(text: string | RegExp) {
    return this.page.getByRole('status').filter({ hasText: text });
  }
}
