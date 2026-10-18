import type { Page } from '@playwright/test';
import { coverPictureRoute } from '../support/covers';

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
    return this.page.getByRole('spinbutton', { name: 'Chapters' });
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

  async breakSaving() {
    await this.page.route('**/api/books', (route) => (route.request().method() === 'POST' ? route.abort() : route.continue()));
  }

  async repairSaving() {
    await this.page.unroute('**/api/books');
  }

  failure() {
    return this.page.getByRole('alert').filter({ hasText: 'The book wasn’t saved' });
  }

  async tryAgain() {
    await this.page.getByRole('button', { name: 'Try again' }).click();
  }

  preview() {
    return this.page.getByRole('complementary', { name: 'Cover preview' });
  }

  previewCover() {
    return this.preview().locator('.cover');
  }

  previewPicture() {
    return this.previewCover().locator('img');
  }

  /** Whether the preview's picture has loaded and has pixels to show. */
  async previewPictureLoaded() {
    return this.previewPicture().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
  }

  private picker() {
    return this.page.getByRole('group', { name: 'Cover picture (optional)' });
  }

  /** The file input behind "Add a picture" or "Change picture". */
  pictureChooser() {
    return this.picker().getByLabel(/Add a picture|Change picture/);
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

  async chooseTooLargePicture() {
    await this.pictureChooser().setInputFiles({ name: 'huge.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
  }

  async removePicture() {
    await this.removePictureButton().click();
  }

  pictureError() {
    return this.picker().getByRole('alert');
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

  async breakPictureUploads() {
    await this.page.route(coverPictureRoute, (route) => (route.request().method() === 'PUT' ? route.abort() : route.continue()));
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Add to my shelf' }).click();
  }
}
