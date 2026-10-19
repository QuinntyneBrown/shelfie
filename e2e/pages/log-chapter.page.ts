import type { Page } from '@playwright/test';
import { SAME_SITE } from '../support/same-site';

export class LogChapterPage {
  constructor(private readonly page: Page) {}

  /** Olive's greeting at the top of the chat. */
  greeting() {
    return this.page.locator('.chat p.bubble__text').first();
  }

  /** The question bubbles shown so far, in order. */
  questionsShown() {
    return this.page.locator('label.bubble__text');
  }

  moreQuestionsHint() {
    return this.page.getByText(/more questions? after this one/);
  }

  nextButton(position: number) {
    return this.page.getByRole('button', { name: `Next question after question ${position}` });
  }

  async next(position: number) {
    await this.nextButton(position).click();
  }

  /** Answers a question and moves on to the next one. */
  async answerAndNext(position: number, text: string) {
    await this.answer(position, text);
    await this.next(position);
  }

  /** Olive's short replies between questions. */
  oliveReplies() {
    return this.page.locator('.chat .bubble--buddy p.bubble__text').filter({ hasNotText: /wants to hear about/ });
  }

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
    return this.page.request.post(`/api/books/${bookId}/chapters/${chapter}`, { ...SAME_SITE, data });
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
    return this.page.request.delete(`/api/chapter-logs/${chapterLogId}`, SAME_SITE);
  }

  confetti() {
    return this.page.locator('.confetti');
  }

  async addNextBook() {
    await this.page.getByRole('link', { name: 'Add my next book' }).click();
  }

  finishedHeading(title?: string) {
    return this.page.getByRole('heading', { name: title ? `You finished ${title}!` : /^You finished .+!$/ });
  }

  /** The rows stacked in the celebration card: badges earned, the streak, and the finished book. */
  celebrationRows() {
    return this.page.locator('.celebrate__rows > *');
  }

  celebrationRow(text: string | RegExp) {
    return this.celebrationRows().filter({ hasText: text });
  }

  /** This week's seven days, inside the celebration. */
  celebrationWeek() {
    return this.page.locator('.celebrate').getByRole('img', { name: /^This week/ });
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

  toast(text: string | RegExp) {
    return this.page.getByRole('status').getByText(text);
  }

  async done() {
    await this.page.getByRole('button', { name: 'I’m done!' }).click();
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  async open(bookId: string, chapter: number) {
    await this.page.goto(`/books/${bookId}/chapters/${chapter}/log`);
  }

  /** The cover picture on the book's main cover (the celebration repeats it in its trophy row); none when the book has no picture. */
  coverPicture() {
    return this.page.locator('main .cover img').first();
  }

  /** The "N of M" beside the celebration's progress bar. */
  progressLabel() {
    return this.page.locator('.celebrate .progress-row__label');
  }

  chaptersToGo() {
    return this.page.getByText(/chapters? to go/);
  }

  progressBar(label: string) {
    return this.page.getByRole('progressbar', { name: label });
  }

  async backToShelf() {
    await this.page.getByRole('link', { name: 'Back to my shelf' }).click();
  }

  /** Replaces the browser's speech recognition with one the test drives; call before the page loads. */
  async useFakeSpeech() {
    await this.page.addInitScript(() => {
      class FakeRecognition {
        lang = '';
        interimResults = false;
        continuous = false;
        onresult: ((event: unknown) => void) | null = null;
        onerror: ((event: unknown) => void) | null = null;
        onend: (() => void) | null = null;
        start() {
          const w = window as unknown as { __fakeSpeech: FakeRecognition[] };
          (w.__fakeSpeech ??= []).push(this);
        }
        stop() {
          this.onend?.();
        }
      }
      Object.assign(window, { SpeechRecognition: FakeRecognition, webkitSpeechRecognition: FakeRecognition });
    });
  }

  /** Makes the browser report that it cannot recognise speech; call before the page loads. */
  async useNoSpeech() {
    await this.page.addInitScript(() => {
      Object.assign(window, { SpeechRecognition: undefined, webkitSpeechRecognition: undefined });
    });
  }

  /** The microphone button under an answer; pressed while it listens. */
  dictateButton(position: number, state: { pressed?: boolean } = {}) {
    return this.page.getByRole('button', { name: `Speak your answer to question ${position}`, ...state });
  }

  async dictate(position: number) {
    await this.dictateButton(position).click();
  }

  /** What the speech recogniser has heard so far, as the latest recogniser reports it. */
  async hear(words: string) {
    await this.page.evaluate((heard) => {
      const all = (window as unknown as { __fakeSpeech: { onresult: (e: unknown) => void }[] }).__fakeSpeech;
      all[all.length - 1].onresult({ resultIndex: 0, results: [[{ transcript: heard }]] });
    }, words);
  }

  /** The speech recogniser fails, as it does when the microphone is refused. */
  async refuseMicrophone() {
    await this.page.evaluate(() => {
      const all = (window as unknown as { __fakeSpeech: { onerror: (e: unknown) => void; onend: () => void }[] }).__fakeSpeech;
      const latest = all[all.length - 1];
      latest.onerror({ error: 'not-allowed' });
      latest.onend();
    });
  }

  async stopSpeech() {
    await this.page.evaluate(() => {
      const all = (window as unknown as { __fakeSpeech: { onend: () => void }[] }).__fakeSpeech;
      all[all.length - 1].onend();
    });
  }

  speechLanguage() {
    return this.page.evaluate(() => (window as unknown as { __fakeSpeech: { lang: string }[] }).__fakeSpeech.at(-1)?.lang);
  }

  listeningHint() {
    return this.page.getByText('Listening… tap to stop');
  }

  cannotHearYou() {
    return this.page.getByText('Shelfie can’t hear you. You can type your answer instead.');
  }

  listeningAnnouncement() {
    return this.page.getByRole('status').filter({ hasText: /^(Listening|Stopped listening)$/ });
  }
}
