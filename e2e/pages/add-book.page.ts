import type { Page } from '@playwright/test';

export class AddBookPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/add-book');
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  titleField() {
    return this.page.getByLabel('Title');
  }

  authorField() {
    return this.page.getByLabel('Author');
  }

  chaptersField() {
    return this.page.getByLabel('Chapters');
  }

  async fill(book: { title: string; author?: string; chapters: number; colour?: string; sticker?: string }) {
    await this.titleField().fill(book.title);
    if (book.author) await this.authorField().fill(book.author);
    await this.chaptersField().fill(String(book.chapters));
    if (book.colour) await this.page.getByRole('radio', { name: book.colour, exact: true }).check({ force: true });
    if (book.sticker) await this.page.getByRole('radio', { name: book.sticker, exact: true }).check({ force: true });
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Add to my shelf' }).click();
  }
}
