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

  trophy() {
    return this.page.getByRole('region', { name: 'Reward' });
  }

  primaryAction(chapter: number) {
    return this.page.getByRole('link', { name: `I read Chapter ${chapter}` });
  }
}
