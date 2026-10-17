import type { Page } from '@playwright/test';

export class BookPage {
  constructor(private readonly page: Page) {}

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  progress(label: string) {
    return this.page.getByRole('progressbar', { name: label });
  }

  chapterRow(number: number) {
    return this.page.locator('.chapter').filter({ has: this.page.getByText(new RegExp(`^Chapter ${number}$`)) });
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

  primaryAction(chapter: number) {
    return this.page.getByRole('link', { name: `I read Chapter ${chapter}` });
  }
}
