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

  private requests = 0;

  watchRequests() {
    this.page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/api/books')) this.requests++;
    });
  }

  requestCount() {
    return this.requests;
  }

  problemSummary() {
    return this.page.getByRole('alert').filter({ hasText: /Fix \d+ things?/ });
  }

  async typeMoreInTitle(text: string) {
    await this.titleField().pressSequentially(text);
  }

  async typeMoreInAuthor(text: string) {
    await this.authorField().pressSequentially(text);
  }

  preview() {
    return this.page.getByRole('complementary', { name: 'Cover preview' });
  }

  previewCover() {
    return this.preview().locator('.cover');
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Add to my shelf' }).click();
  }
}
