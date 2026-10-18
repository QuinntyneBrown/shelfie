import type { Page } from '@playwright/test';
import { SAME_SITE } from '../support/same-site';

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

  queueCoverPicture(chapter: number) {
    return this.queue().filter({ hasText: `Chapter ${chapter} ·` }).locator('.cover img');
  }

  rewardCardCoverPicture(title: string) {
    return this.rewardCard(title).locator('.cover img');
  }

  rewardDialogCoverPicture() {
    return this.rewardDialog().locator('.cover img');
  }

  async openGiveReward(title: string) {
    await this.rewardCard(title).getByRole('button', { name: 'Give a reward' }).click();
  }

  rewardDialog() {
    return this.page.getByRole('dialog', { name: /is finished!/ });
  }

  rewardField() {
    return this.rewardDialog().getByRole('textbox', { name: 'The reward' });
  }

  quickPick(text: string) {
    return this.rewardDialog().getByRole('group', { name: 'Quick picks' }).getByRole('button', { name: text });
  }

  async giveReward() {
    await this.rewardDialog().getByRole('button', { name: 'Give the reward' }).click();
  }

  private rewardPosts = 0;

  watchRewardPosts() {
    this.page.on('request', (request) => {
      if (request.url().endsWith('/reward')) this.rewardPosts++;
    });
  }

  rewardPostCount() {
    return this.rewardPosts;
  }

  async breakRewards() {
    await this.page.route('**/reward', (route) => route.abort());
  }

  postRewardViaApi(bookId: string, data: unknown) {
    return this.page.request.post(`/api/books/${bookId}/reward`, { ...SAME_SITE, data });
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
