import type { Page } from '@playwright/test';

export class ShelfPage {
  constructor(private readonly page: Page) {}

  summary() {
    return this.page.getByText(/day streak/);
  }

  feedbackBanner() {
    return this.page.getByRole('status').filter({ hasText: /read Chapter \d+ and gave you/ });
  }

  async openFeedback(chapter: number) {
    await this.page.getByRole('link', { name: `Open Chapter ${chapter}` }).click();
  }

  async dismissFeedback() {
    await this.feedbackBanner().getByRole('button', { name: 'Dismiss' }).click();
  }

  greeting() {
    return this.page.getByRole('heading', { level: 1 });
  }

  group(name: 'On the go' | 'Up next' | 'Finished') {
    return this.page.getByRole('region', { name });
  }

  book(group: 'On the go' | 'Up next', title: string) {
    return this.group(group).getByRole('article').filter({ hasText: title });
  }

  coverPicture(group: 'On the go' | 'Up next', title: string) {
    return this.cover(group, title).locator('img');
  }

  /** Whether the cover picture has loaded and has pixels to show. */
  async coverPictureLoaded(group: 'On the go' | 'Up next', title: string) {
    return this.coverPicture(group, title).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
  }

  async openBook(group: 'On the go' | 'Up next', title: string) {
    await this.book(group, title).getByRole('link', { name: title, exact: true }).click();
  }

  async openFinishedBook(title: string) {
    await this.finishedBook(title).getByRole('link', { name: title }).click();
  }

  async addBook() {
    await this.page.getByRole('link', { name: 'Add a book' }).click();
  }

  toast(text: string) {
    return this.page.getByRole('status').getByText(text);
  }

  async logChapter(group: 'On the go' | 'Up next', title: string, chapter: number) {
    await this.book(group, title).getByRole('link', { name: new RegExp(`Chapter ${chapter}\$`) }).click();
  }

  finishedBook(title: string) {
    return this.group('Finished').getByRole('listitem').filter({ hasText: title });
  }

  finishedCoverPicture(title: string) {
    return this.finishedBook(title).locator('.cover img');
  }

  emptyTitle() {
    return this.page.getByRole('heading', { name: 'Your shelf is empty' });
  }

  askAGrownUp() {
    return this.page.getByText(/Ask a grown-up to add/);
  }

  loading() {
    return this.page.getByRole('region', { name: 'Loading your shelf' });
  }

  loadError() {
    return this.page.getByRole('heading', { name: 'Your shelf didn’t load' });
  }

  async tryAgain() {
    await this.page.getByRole('button', { name: 'Try again' }).click();
  }

  /** Holds the shelf response until the returned function is called. */
  async holdShelfResponse() {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await this.page.route('**/api/shelf', async (route) => {
      await gate;
      await route.continue();
    });
    return release;
  }

  async breakShelfRequests() {
    await this.page.route('**/api/shelf', (route) => route.abort());
  }

  async repairShelfRequests() {
    await this.page.unroute('**/api/shelf');
  }

  /** Number of columns the first grid on the page lays out. */
  async columns() {
    return this.page
      .locator('.grid')
      .first()
      .evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length);
  }

  async scrollsSideways() {
    return this.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  }

  async cardOverflows(group: 'On the go' | 'Up next', title: string) {
    return this.book(group, title).evaluate((card) => card.scrollWidth > card.clientWidth);
  }

  cover(group: 'On the go' | 'Up next', title: string) {
    return this.book(group, title).locator('.cover');
  }

  /** The "Reading toward" reward gallery. */
  gallery() {
    return this.page.getByRole('region', { name: 'Reading toward' });
  }

  galleryReward(name: string) {
    return this.gallery().getByRole('listitem').filter({ hasText: name });
  }

  async pickGoal(name: string) {
    await this.gallery().getByRole('button', { name: `Pick ${name}` }).click();
  }

  pickButtons() {
    return this.gallery().getByRole('button', { name: /^Pick / });
  }

  goalProgress(name: string) {
    return this.galleryReward(name).getByRole('progressbar');
  }

  noRewardsYet() {
    return this.gallery().getByRole('heading', { name: 'No rewards to pick yet' });
  }

  galleryLoadError() {
    return this.gallery().getByRole('heading', { name: 'Your rewards didn’t load' });
  }

  async retryGallery() {
    await this.gallery().getByRole('button', { name: 'Try again' }).click();
  }

  goalCelebration() {
    return this.gallery().getByRole('heading', { name: /You did it!/ });
  }

  async breakGalleryRequests() {
    await this.page.route('**/api/gallery-rewards**', (route) => route.abort());
  }

  async repairGalleryRequests() {
    await this.page.unroute('**/api/gallery-rewards**');
  }

  async reload() {
    await this.page.reload();
  }
}
