import type { Page } from '@playwright/test';

export class LogChapterPage {
  constructor(private readonly page: Page) {}

  async answer(position: number, text: string) {
    await this.page.getByLabel(new RegExp(`^${position}\\.`)).fill(text);
  }

  answerBox(position: number) {
    return this.page.getByLabel(new RegExp(`^${position}\\.`));
  }

  async typeMore(position: number, text: string) {
    await this.answerBox(position).pressSequentially(text);
  }

  async answerLength(position: number) {
    return (await this.answerBox(position).inputValue()).length;
  }

  charactersLeft() {
    return this.page.getByText(/characters? left/);
  }

  summary() {
    return this.page.getByRole('alert');
  }

  /** Posts a log straight to the API, as a client that skips the form would. */
  postLog(bookId: string, chapter: number, data: unknown) {
    return this.page.request.post(`/api/books/${bookId}/chapters/${chapter}`, { data });
  }

  async chooseDay(day: 'Today' | 'Yesterday' | 'Another day') {
    await this.page.getByRole('button', { name: day }).click();
  }

  async pickDay(isoDate: string) {
    await this.page.getByLabel('Pick the day').fill(isoDate);
  }

  dayError() {
    return this.page.getByText('Pick today or an earlier day.');
  }

  readForm(bookId: string, chapter: number) {
    return this.page.request.get(`/api/books/${bookId}/chapters/${chapter}/form`);
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
