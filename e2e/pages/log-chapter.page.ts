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

  async useFakeTimers() {
    await this.page.clock.install();
  }

  async letTimePass(milliseconds: number) {
    // The first tick lets the page react to what she typed; the second is the pause itself.
    await this.page.clock.fastForward(50);
    await this.page.clock.fastForward(milliseconds);
  }

  async reload() {
    await this.page.reload();
  }

  dayChosen(day: 'Today' | 'Yesterday' | 'Another day') {
    return this.page.getByRole('button', { name: day });
  }

  async hasSavedDraft(bookId: string, chapter: number) {
    return this.page.evaluate((key) => localStorage.getItem(key) !== null, `draft:chapter:${bookId}:${chapter}`);
  }

  undoToast() {
    return this.page.getByRole('status').filter({ hasText: 'saved' });
  }

  async undo() {
    await this.undoToast().getByRole('button', { name: 'Undo' }).click();
  }

  async hoverToast() {
    await this.undoToast().getByRole('button', { name: 'Undo' }).hover();
  }

  async moveAwayFromToast() {
    await this.page.mouse.move(0, 0);
  }

  /** Asks the API to undo a log, as a client that skips the toast would. */
  undoViaApi(chapterLogId: string) {
    return this.page.request.delete(`/api/chapter-logs/${chapterLogId}`);
  }

  confetti() {
    return this.page.locator('.confetti');
  }

  async addNextBook() {
    await this.page.getByRole('link', { name: 'Add my next book' }).click();
  }

  finishedHeading() {
    return this.page.getByRole('heading', { name: 'You finished the whole book!' });
  }

  async notYet() {
    await this.page.getByRole('link', { name: 'Not yet' }).click();
  }

  /** Makes saving a chapter fail as if the connection dropped; other requests are unaffected. */
  async failSaving() {
    await this.page.route('**/api/books/*/chapters/*', (route) =>
      route.request().method() === 'POST' ? route.abort() : route.continue(),
    );
  }

  async repairSaving() {
    await this.page.unroute('**/api/books/*/chapters/*');
  }

  failureToasts() {
    return this.page.getByRole('status').getByText('Couldn’t save your answers');
  }

  async showMoreToasts() {
    await this.page.getByRole('button', { name: /more/ }).click();
  }

  moreToasts() {
    return this.page.getByRole('button', { name: /^\+\d+ more$/ });
  }

  async retry() {
    await this.page.getByRole('button', { name: 'Retry' }).click();
  }

  /** Presses I’m done! from the keyboard, which works even when something is drawn over the button. */
  async doneByKeyboard() {
    await this.page.getByRole('button', { name: 'I’m done!' }).press('Enter');
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
