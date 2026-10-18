import type { Page } from '@playwright/test';

export class BookPage {
  constructor(private readonly page: Page) {}

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  async open(bookId: string) {
    await this.page.goto(`/book/${bookId}`);
  }

  /** The cover picture on the book's cover; there is none when the book has no picture. */
  coverPicture() {
    return this.page.locator('main .cover img');
  }

  progress(label: string) {
    return this.page.getByRole('progressbar', { name: label });
  }

  chapterRow(number: number) {
    return this.page.locator('.chapter').filter({ has: this.page.getByText(new RegExp(`^Chapter ${number}$`)) });
  }

  async logNext(chapter: number) {
    await this.primaryAction(chapter).click();
  }

  async openChapterRow(number: number) {
    await this.chapterRow(number).click();
  }

  async breakLoading() {
    await this.page.route('**/api/books/b-lion', (route) => route.abort());
  }

  async repairLoading() {
    await this.page.unroute('**/api/books/b-lion');
  }

  loadFailure() {
    return this.page.getByRole('heading', { name: 'The chapters didn’t load' });
  }

  async tryAgain() {
    await this.page.getByRole('button', { name: 'Try again' }).click();
  }

  hiddenChapters() {
    return this.page.getByText(/^Chapters \d+ to \d+ \(\d+ more\)$/);
  }

  trophy() {
    return this.page.getByRole('region', { name: 'Reward' });
  }

  async backToShelf() {
    await this.page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'My shelf' }).click();
  }

  primaryAction(chapter: number) {
    return this.page.getByRole('link', { name: `I read Chapter ${chapter}` });
  }
}
