import type { Page } from '@playwright/test';
import { coverPictureRoute } from '../support/covers';
import { SAME_SITE } from '../support/same-site';

export class ManageBookPage {
  constructor(private readonly page: Page) {}

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  async open(bookId: string) {
    await this.page.goto(`/manage-book/${bookId}`);
  }

  /** The header cover: the sticker on its colour, with the cover picture over them when there is one. */
  cover() {
    return this.page.locator('.page-header .cover');
  }

  coverPicture() {
    return this.cover().locator('img');
  }

  coverPictureUrl() {
    return this.coverPicture().getAttribute('src');
  }

  /** Whether the cover picture has loaded and has pixels to show. */
  async coverPictureLoaded() {
    return this.coverPicture().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
  }

  private picker() {
    return this.page.getByRole('group', { name: 'Cover picture' });
  }

  /** The file input behind "Add a picture" or "Change picture". */
  pictureChooser() {
    return this.picker().getByLabel(/Add a picture|Change picture/);
  }

  /** The button face of the chooser, which shows the busy state. */
  pictureChooserButton() {
    return this.picker().locator('label.btn');
  }

  removePictureButton() {
    return this.picker().getByRole('button', { name: 'Remove picture' });
  }

  async choosePicture(file: string) {
    await this.pictureChooser().setInputFiles(file);
  }

  async chooseNotAPicture() {
    await this.pictureChooser().setInputFiles({ name: 'story.txt', mimeType: 'text/plain', buffer: Buffer.from('Once upon a time') });
  }

  /** A real JPEG name and type, but not a picture inside. */
  async chooseBrokenJpeg() {
    await this.pictureChooser().setInputFiles({ name: 'cover.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not really a jpeg') });
  }

  async chooseTooLargePicture() {
    await this.pictureChooser().setInputFiles({ name: 'huge.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
  }

  async removePicture() {
    await this.removePictureButton().click();
  }

  /** The picker's own error. */
  pictureError() {
    return this.picker().getByRole('alert');
  }

  pictureFailure() {
    return this.page.getByRole('alert').filter({ hasText: /The picture (didn’t upload|wasn’t removed)/ });
  }

  async tryAgain() {
    await this.pictureFailure().getByRole('button', { name: 'Try again' }).click();
  }

  toast(text: string) {
    return this.page.getByRole('status').getByText(text);
  }

  private pictureUploads = 0;

  watchPictureUploads() {
    this.page.on('request', (request) => {
      if (request.method() === 'PUT' && /\/api\/books\/[^/]+\/cover$/.test(request.url())) this.pictureUploads++;
    });
  }

  pictureUploadCount() {
    return this.pictureUploads;
  }

  async breakPictureChanges() {
    await this.page.route(coverPictureRoute, (route) => (route.request().method() === 'GET' ? route.continue() : route.abort()));
  }

  async repairPictureChanges() {
    await this.page.unroute(coverPictureRoute);
  }

  /** Holds picture uploads until the returned function is called. */
  async holdPictureUploads() {
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    await this.page.route(coverPictureRoute, async (route) => {
      if (route.request().method() === 'PUT') await released;
      await route.continue();
    });
    return release;
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

  /** The card for a book whose reward has been given. */
  rewardedCard() {
    return this.page.getByRole('region', { name: /Reward given/ });
  }

  questions() {
    return this.page.getByRole('region', { name: /chapter questions/ }).getByRole('listitem');
  }

  question(text: string) {
    return this.questions().filter({ hasText: text });
  }

  async addQuestion(text: string) {
    await this.page.getByRole('button', { name: 'Add a question' }).click();
    await this.questionDialog().getByLabel('Question').fill(text);
    await this.questionDialog().getByRole('button', { name: 'Add question' }).click();
  }

  async suggestQuestions() {
    await this.page.getByRole('button', { name: 'Suggest questions' }).click();
  }

  /** Presses Print certificate and returns the download it starts. */
  async printCertificate() {
    const download = this.page.waitForEvent('download');
    await this.page.getByRole('link', { name: 'Print certificate' }).click();
    return download;
  }

  async openAddQuestion() {
    await this.page.getByRole('button', { name: 'Add a question' }).click();
  }

  async confirmAddQuestion() {
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

  removeDialogCoverPicture() {
    return this.removeDialog().locator('.cover img');
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
