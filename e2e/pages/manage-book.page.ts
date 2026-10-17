import type { Page } from '@playwright/test';
import { SAME_SITE } from '../support/same-site';

export class ManageBookPage {
  constructor(private readonly page: Page) {}

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  loggedChapters() {
    return this.page.getByRole('table', { name: 'Chapters logged' });
  }

  title() {
    return this.page.getByLabel('Title');
  }

  author() {
    return this.page.getByLabel('Author');
  }

  chapters() {
    return this.page.getByLabel('Chapters', { exact: true });
  }

  async save() {
    await this.page.getByRole('button', { name: 'Save details' }).click();
  }

  saved() {
    return this.page.getByText('Saved just now');
  }

  private saves = 0;

  watchSaves() {
    this.page.on('request', (request) => {
      if (request.method() === 'PATCH' && /\/api\/books\//.test(request.url())) this.saves++;
    });
  }

  saveRequestCount() {
    return this.saves;
  }

  questions() {
    return this.page.getByRole('region', { name: /Questions/ }).getByRole('listitem');
  }

  question(text: string) {
    return this.questions().filter({ hasText: text });
  }

  async addQuestion(text: string) {
    await this.page.getByRole('button', { name: 'Add a question' }).click();
    await this.questionDialog().getByLabel('Question').fill(text);
    await this.questionDialog().getByRole('button', { name: 'Add question' }).click();
  }

  async editQuestion(from: string, to: string) {
    await this.question(from).getByRole('button', { name: 'Edit' }).click();
    await this.questionDialog().getByLabel('Question').fill(to);
    await this.questionDialog().getByRole('button', { name: 'Save' }).click();
  }

  async removeQuestion(text: string) {
    await this.question(text).getByRole('button', { name: 'Remove' }).click();
  }

  private questionWrites = 0;

  watchQuestionWrites() {
    this.page.on('request', (request) => {
      if (/\/questions/.test(request.url()) && request.method() !== 'GET') this.questionWrites++;
    });
  }

  questionWriteCount() {
    return this.questionWrites;
  }

  async breakQuestionSaving() {
    await this.page.route('**/questions**', (route) => route.abort());
  }

  questionDialog() {
    return this.page.getByRole('dialog', { name: /question/i });
  }

  questionField() {
    return this.questionDialog().getByLabel('Question');
  }

  removeButton() {
    return this.page.getByRole('button', { name: 'Remove book', exact: true });
  }

  async openRemoveDialog() {
    await this.removeButton().click();
  }

  removeDialog() {
    return this.page.getByRole('dialog', { name: /^Remove/ });
  }

  keepButton() {
    return this.removeDialog().getByRole('button', { name: 'Keep the book' });
  }

  async confirmRemove() {
    await this.removeDialog().getByRole('button', { name: 'Remove book and answers' }).click();
  }

  /** Gap between the dialog's bottom edge and the bottom of the window, in px. */
  async gapBelowDialog() {
    return this.removeDialog().evaluate((dialog) => window.innerHeight - dialog.getBoundingClientRect().bottom);
  }

  async pressEscape() {
    await this.page.keyboard.press('Escape');
  }

  async breakRemoving() {
    await this.page.route('**/api/books/*', (route) => (route.request().method() === 'DELETE' ? route.abort() : route.continue()));
  }

  deleteViaApi(bookId: string) {
    return this.page.request.delete(`/api/books/${bookId}`, SAME_SITE);
  }

  /** Asks the API to change a book, as a client that skips the page would. */
  patchViaApi(bookId: string, data: unknown) {
    return this.page.request.patch(`/api/books/${bookId}`, { ...SAME_SITE, data });
  }
}
