import type { Page } from '@playwright/test';

/** Add or edit a book in an author's catalogue. */
export class CatalogueBookDialog {
  private saves = 0;

  constructor(private readonly page: Page) {
    page.on('request', (request) => {
      if (/\/api\/catalogue-books(\/[^/]+)?$/.test(request.url()) && ['POST', 'PATCH'].includes(request.method())) this.saves++;
    });
  }

  saveCount() {
    return this.saves;
  }

  dialog() {
    return this.page.getByRole('dialog', { name: /Add a book to your catalogue|Edit a book/ });
  }

  titleField() {
    return this.dialog().getByLabel('Title');
  }

  chaptersField() {
    return this.dialog().getByLabel('Number of chapters');
  }

  descriptionField() {
    return this.dialog().getByLabel(/Short description/);
  }

  async fill(book: { title?: string; chapters?: string; description?: string }) {
    if (book.title !== undefined) await this.titleField().fill(book.title);
    if (book.chapters !== undefined) await this.chaptersField().fill(book.chapters);
    if (book.description !== undefined) await this.descriptionField().fill(book.description);
  }

  private chooser() {
    return this.dialog().getByLabel(/Add a picture|Change picture/);
  }

  async choosePicture(file: string) {
    await this.chooser().setInputFiles(file);
  }

  async chooseNotAPicture() {
    await this.chooser().setInputFiles({ name: 'story.txt', mimeType: 'text/plain', buffer: Buffer.from('Once upon a time') });
  }

  async chooseTooLarge() {
    await this.chooser().setInputFiles({ name: 'huge.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
  }

  /** The picture shown in the dialog's cover preview, when there is one. */
  previewPicture() {
    return this.dialog().locator('.cover img');
  }

  pictureError() {
    return this.dialog().locator('.field__error[role="alert"]');
  }

  async save() {
    await this.dialog().getByRole('button', { name: /Add book|Save changes/ }).click();
  }

  problemSummary() {
    return this.dialog().getByRole('alert').filter({ hasText: /Fix \d+ things?/ });
  }
}
