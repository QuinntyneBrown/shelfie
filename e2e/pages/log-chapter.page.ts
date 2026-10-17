import type { Page } from '@playwright/test';

export class LogChapterPage {
  constructor(private readonly page: Page) {}

  async answer(position: number, text: string) {
    await this.page.getByLabel(new RegExp(`^${position}\\.`)).fill(text);
  }

  async done() {
    await this.page.getByRole('button', { name: 'I’m done!' }).click();
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  progressSummary() {
    return this.page.getByText(/That’s \d+ of \d+/);
  }

  progressBar(label: string) {
    return this.page.getByRole('progressbar', { name: label });
  }

  async backToShelf() {
    await this.page.getByRole('link', { name: 'Back to my shelf' }).click();
  }
}
