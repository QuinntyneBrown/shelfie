import type { Page } from '@playwright/test';

/** A logged chapter, read-only: Nia's answers and, once reviewed, Dad's feedback. */
export class ChapterPage {
  constructor(private readonly page: Page) {}

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  async open(chapterLogId: string) {
    await this.page.goto(`/chapter-logs/${chapterLogId}`);
  }

  /** The cover picture on the book's cover; there is none when the book has no picture. */
  coverPicture() {
    return this.page.locator('main .cover img');
  }

  whenRead() {
    return this.page.getByText(/you read it/);
  }

  waitingCard() {
    return this.page.getByRole('region', { name: /hasn’t read this yet/ });
  }

  feedback() {
    return this.page.getByRole('region', { name: /gave you a/ });
  }

  answers() {
    return this.page.getByRole('region', { name: 'Your answers' }).getByRole('listitem');
  }

  answer(position: number) {
    return this.answers().nth(position - 1);
  }

  async backToBook() {
    await this.page.getByRole('link', { name: 'Back to the book' }).click();
  }

  nextChapterLink(number: number) {
    return this.page.getByRole('link', { name: `Chapter ${number}`, exact: true });
  }
}
