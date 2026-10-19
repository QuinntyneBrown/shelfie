import { expect, type Page } from '@playwright/test';

/** The one-time set-up wizard a parent sees after signing up: five full-screen steps under the auth layout. */
export class OnboardingPage {
  private readerRequests = 0;
  private rewardRequests = 0;

  constructor(private readonly page: Page) {
    page.on('request', (request) => {
      if (request.url().endsWith('/api/readers') && request.method() === 'POST') this.readerRequests++;
      if (request.url().endsWith('/api/gallery-rewards') && request.method() === 'POST') this.rewardRequests++;
    });
  }

  readerRequestCount() {
    return this.readerRequests;
  }

  rewardRequestCount() {
    return this.rewardRequests;
  }

  async open(step?: 'child' | 'sign-in' | 'reward' | 'done') {
    await this.page.goto(step ? `/onboarding/${step}` : '/onboarding');
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  /** The "Step N of M" label of the step indicator. */
  stepLabel() {
    return this.page.getByText(/^Step \d of \d$/);
  }

  async letsGo() {
    await this.page.getByRole('link', { name: 'Let’s go' }).click();
    await expect(this.page).not.toHaveURL(/\/onboarding$/);
  }

  async skipForNow() {
    await this.page.getByRole('link', { name: 'Skip for now' }).click();
  }

  skipLink() {
    return this.page.getByRole('link', { name: 'Skip for now' });
  }

  nameField() {
    return this.page.getByLabel('Child’s name');
  }

  usernameField() {
    return this.page.getByLabel('Username');
  }

  passwordField() {
    return this.page.getByRole('textbox', { name: 'Password', exact: true });
  }

  async next() {
    await this.page.getByRole('button', { name: 'Next' }).click();
  }

  /** Presses Next while it is busy, as an impatient second tap would. */
  async pressNextAgain() {
    await this.page.getByRole('button', { name: 'Next' }).click({ force: true });
  }

  async back() {
    await this.page.getByRole('link', { name: 'Back' }).click();
  }

  problemSummary() {
    return this.page.getByRole('alert').filter({ hasText: /Fix \d+ things?/ });
  }

  failure() {
    return this.page.getByRole('alert').filter({ hasText: /wasn’t added/ });
  }

  async tryAgain() {
    await this.page.getByRole('button', { name: 'Try again' }).click();
  }

  async breakReaders() {
    await this.page.route('**/api/readers', (route) => route.abort());
  }

  async repairReaders() {
    await this.page.unroute('**/api/readers');
  }

  /** Makes the next reader request take a moment, so a second press can be observed. */
  async slowReaders(ms: number) {
    await this.page.route('**/api/readers', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      await route.continue();
    });
  }

  rewardField() {
    return this.page.getByLabel('The reward');
  }

  booksField() {
    return this.page.getByLabel('Books to finish');
  }

  async tapExample(name: string) {
    await this.page.getByRole('group', { name: 'Examples' }).getByRole('button', { name }).click();
  }

  async addAnother() {
    await this.page.getByRole('button', { name: 'Add another' }).click();
  }

  /** The rewards already added on the reward step. */
  rewardsAdded() {
    return this.page.getByRole('list', { name: 'Rewards added' }).getByRole('listitem');
  }

  backLink() {
    return this.page.getByRole('link', { name: 'Back' });
  }

  async breakRewards() {
    await this.page.route('**/api/gallery-rewards', (route) => (route.request().method() === 'POST' ? route.abort() : route.continue()));
  }

  async repairRewards() {
    await this.page.unroute('**/api/gallery-rewards');
  }

  /** The child's sign-in details on All set: the username and, the first time, the password. */
  detail(label: 'Username' | 'Password') {
    return this.page.getByRole('definition').filter({ has: this.page.locator(`xpath=preceding-sibling::dt[1][normalize-space()="${label}"]`) });
  }

  async goToMyShelf() {
    await this.page.getByRole('button', { name: 'Go to my shelf' }).click();
  }

  /** Whether the text appears anywhere this browser stores things for the site. */
  async storedAnywhere(text: string) {
    const cookies = (await this.page.context().cookies()).map((c) => c.value).join(' ');
    const inStorage = await this.page.evaluate(
      (needle) => [localStorage, sessionStorage].some((s) => Object.keys(s).some((k) => k.includes(needle) || (s.getItem(k) ?? '').includes(needle))),
      text,
    );
    return cookies.includes(text) || inStorage || this.page.url().includes(text);
  }

  loadFailure() {
    return this.page.getByRole('heading', { name: 'Shelfie couldn’t pick up where you left off' });
  }

  /** Makes the read of the household's readers fail, as a dropped connection on a reload would. */
  async breakHousehold() {
    await this.page.route('**/api/settings', (route) => (route.request().method() === 'GET' ? route.abort() : route.continue()));
  }

  async repairHousehold() {
    await this.page.unroute('**/api/settings');
  }

  /** The shell's primary navigation, which the wizard never shows. */
  shellNavigation() {
    return this.page.getByRole('navigation', { name: /^Primary/ });
  }
}
