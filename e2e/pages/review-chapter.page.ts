import type { Page } from '@playwright/test';
import { SAME_SITE } from '../support/same-site';

export class ReviewChapterPage {
  constructor(private readonly page: Page) {}

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  async open(chapterLogId: string) {
    await this.page.goto(`/review/chapters/${chapterLogId}`);
  }

  /** The cover picture on the book's cover; there is none when the book has no picture. */
  coverPicture() {
    return this.page.locator('main .cover img');
  }

  answers() {
    return this.page.getByRole('region', { name: /answers$/ }).getByRole('listitem');
  }

  stickers() {
    return this.page.getByRole('radiogroup', { name: 'Pick a sticker' }).getByRole('radio');
  }

  async pickSticker(name: string) {
    await this.page.getByRole('radio', { name, exact: true }).check({ force: true });
  }

  noteField() {
    return this.page.getByLabel('Say something to Nia (optional)');
  }

  async send() {
    await this.page.getByRole('button', { name: 'Send to Nia' }).click();
  }

  stickerError() {
    return this.page.getByText('Pick one so Nia knows you read it.');
  }

  sentHeading() {
    return this.page.getByRole('heading', { name: 'Sent to Nia' });
  }

  async reviewNext(chapter: number) {
    await this.page.getByRole('link', { name: `Review Chapter ${chapter}` }).click();
  }

  sentFeedback() {
    return this.page.getByRole('region', { name: /You gave a/ });
  }

  private sends = 0;

  watchSends() {
    this.page.on('request', (request) => {
      if (request.url().endsWith('/feedback')) this.sends++;
    });
  }

  sendCount() {
    return this.sends;
  }

  sendViaApi(chapterLogId: string, data: unknown) {
    return this.page.request.post(`/api/chapter-logs/${chapterLogId}/feedback`, { ...SAME_SITE, data });
  }
}
