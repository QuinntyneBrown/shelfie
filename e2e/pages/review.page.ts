import type { Page } from '@playwright/test';

/** The grown-up's Review page: chapters waiting for feedback and books waiting for a reward. */
export class ReviewPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/review');
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  summary() {
    return this.page.getByText(/to read ·|all caught up/i).first();
  }

  queue() {
    return this.page.getByRole('region', { name: 'Waiting for you' }).getByRole('listitem');
  }

  async review(chapter: number) {
    await this.queue()
      .filter({ hasText: `Chapter ${chapter} ·` })
      .getByRole('link', { name: 'Review' })
      .click();
  }

  rewardCard(title: string) {
    return this.page.getByRole('region', { name: `${title} is finished!` });
  }

  caughtUp() {
    return this.page.getByRole('heading', { name: 'All caught up' });
  }

  stat(name: string) {
    return this.page.getByRole('region', { name: 'This week' }).getByText(name).locator('..');
  }

  activity() {
    return this.page.getByRole('region', { name: 'Recent activity' }).getByRole('listitem');
  }

  getViaApi() {
    return this.page.request.get('/api/review');
  }
}
