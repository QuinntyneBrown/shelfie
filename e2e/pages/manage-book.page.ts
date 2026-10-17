import type { Page } from '@playwright/test';

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

  /** Asks the API to change a book, as a client that skips the page would. */
  patchViaApi(bookId: string, data: unknown) {
    return this.page.request.patch(`/api/books/${bookId}`, { data });
  }
}
