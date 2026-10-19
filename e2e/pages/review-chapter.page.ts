import { expect, type Page } from '@playwright/test';
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

  /** The sticker's tile: clicking it waits for the page to settle, which a forced click on the hidden radio does not. */
  private stickerTile(name: string) {
    return this.page
      .getByRole('radiogroup', { name: 'Pick a sticker' })
      .locator('label')
      .filter({ has: this.page.getByText(name, { exact: true }) });
  }

  async pickSticker(name: string) {
    await this.stickerTile(name).click();
    await expect(this.page.getByRole('radio', { name, exact: true })).toBeChecked();
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

  helpButton() {
    return this.page.getByRole('button', { name: 'Help me review' });
  }

  async askForHelp() {
    await this.helpButton().click();
  }

  /** The "Talk about this" flag under an answer, by its position in the list (1-based). */
  flag(position: number) {
    return this.answers()
      .nth(position - 1)
      .getByRole('status')
      .filter({ hasText: 'Talk about this' });
  }

  flags() {
    return this.answers().getByRole('status').filter({ hasText: 'Talk about this' });
  }

  /** The assistant's line in the feedback card: how many answers to talk about, or that every answer looks good. */
  assistSummary() {
    return this.page.getByRole('status').filter({ hasText: /to talk about|Every answer looks good/ });
  }

  /** The assistant's suggested note, with its Use draft button. */
  suggestedNote() {
    return this.page.getByRole('status').filter({ hasText: 'Suggested note' });
  }

  useDraftButton() {
    return this.page.getByRole('button', { name: 'Use draft' });
  }

  async useDraft() {
    await this.useDraftButton().click();
  }

  assistFailed() {
    return this.page.getByRole('alert').filter({ hasText: 'The assistant couldn’t help this time' });
  }

  async tryAgain() {
    await this.assistFailed().getByRole('button', { name: 'Try again' }).click();
  }

  assistNotSetUp() {
    return this.page.getByRole('status').filter({ hasText: 'The assistant isn’t set up' });
  }

  private assists = 0;

  watchAssists() {
    this.page.on('request', (request) => {
      if (request.url().endsWith('/assist')) this.assists++;
    });
  }

  assistCount() {
    return this.assists;
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

  /** The space in pixels between the bottom of the top bar and the top of the breadcrumb. */
  async breadcrumbGapBelowTopBar() {
    const bar = await this.page.getByRole('banner').boundingBox();
    const crumb = await this.page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('listitem').first().boundingBox();
    return crumb!.y - (bar!.y + bar!.height);
  }

  /** The chapter's reader beside the title, "Theo’s chapter", shown when the household has two or more readers. */
  readerLabel() {
    return this.page.locator('.book-card__body').getByText(/’s chapter$/);
  }
}
