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

  /** The line on a finished book's card saying it reached Nia's goal. */
  goalLine(title: string) {
    return this.rewardCard(title).getByText(/reached her goal/);
  }

  /** Presses Print certificate on a finished book's card and returns the download it starts. */
  async printCertificate(title: string) {
    const download = this.page.waitForEvent('download');
    await this.rewardCard(title).getByRole('link', { name: 'Print certificate' }).click();
    return download;
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

  /** The read-only "Nia’s badges" card. */
  badges() {
    return this.page.getByRole('region', { name: /^Nia’s badges/ });
  }

  badge(name: string) {
    return this.badges().getByRole('listitem').filter({ hasText: name });
  }

  /** How the badges are laid out: whether the list shows bullets, how many tiles share the first row, and how many different tile heights there are. */
  async badgeLayout() {
    const items = this.badges().getByRole('listitem');
    const bullets = await items.first().evaluate((li) => getComputedStyle(li).listStyleType !== 'none');
    const tops = await items.evaluateAll((lis) => lis.map((li) => Math.round(li.getBoundingClientRect().top)));
    const heights = await this.badges().locator('.achievement').evaluateAll((tiles) => tiles.map((t) => Math.round(t.getBoundingClientRect().height)));
    return { bullets, perRow: tops.filter((top) => top === tops[0]).length, heights: [...new Set(heights)].length };
  }

  async scrollsSideways() {
    return this.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  }

  /** Makes loading the review queue fail, as a dropped connection would. */
  async breakLoading() {
    await this.page.route('**/api/review', (route) => route.abort());
  }

  async repairLoading() {
    await this.page.unroute('**/api/review');
  }

  loadError() {
    return this.page.getByRole('heading', { name: 'Review didn’t load' });
  }

  async tryAgain() {
    await this.page.getByRole('button', { name: 'Try again' }).click();
  }

  /** The card for an earned streak reward that has not been given yet. */
  streakRewardCard(days: number) {
    return this.page.getByRole('region', { name: `${days}-day streak reached!` });
  }

  async giveStreakReward(days: number) {
    await this.streakRewardCard(days).getByRole('button', { name: 'Give it' }).click();
  }

  toast(text: string) {
    return this.page.getByRole('status').getByText(text);
  }

  async breakGiving() {
    await this.page.route('**/api/streak-rewards/*/give', (route) => route.abort());
  }

  async repairGiving() {
    await this.page.unroute('**/api/streak-rewards/*/give');
  }

  /** Opens Review straight on the Challenges tab. */
  async openChallenges() {
    await this.page.goto('/review?tab=challenges');
  }

  async showTab(name: 'To review' | 'Challenges') {
    await this.page.getByRole('group', { name: 'Show' }).getByRole('button', { name }).click();
  }

  challengeCard(name: string) {
    return this.page.getByRole('region', { name });
  }

  /** The rows of the leaderboard on the Challenges tab, in the order shown. */
  leaderboard() {
    return this.page.getByRole('list', { name: 'Leaderboard' }).first().getByRole('listitem');
  }
}
