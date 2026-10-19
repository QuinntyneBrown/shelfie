import type { Page } from '@playwright/test';

/** Read together: who she read with, what they did, how long and when. */
export class LogTogetherPage {
  private requests = 0;

  constructor(private readonly page: Page) {
    page.on('request', (request) => {
      if (request.url().endsWith('/api/together/sessions') && request.method() === 'POST') this.requests++;
    });
  }

  requestCount() {
    return this.requests;
  }

  async open() {
    await this.page.goto('/together/log');
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  partners() {
    return this.page.getByRole('group', { name: 'Who you read with' });
  }

  partner(name: string) {
    return this.partners().getByRole('button', { name });
  }

  async pickPartner(name: string) {
    await this.partner(name).click();
  }

  choice(group: 'What you did' | 'How long' | 'Day you read together', label: string) {
    return this.page.getByRole('group', { name: group }).getByRole('button', { name: label, exact: true });
  }

  async pickWhat(label: 'I read to her' | 'I helped her read' | 'She read to me') {
    await this.choice('What you did', label).click();
  }

  async pickMinutes(label: string) {
    await this.choice('How long', label).click();
  }

  async typeMinutes(minutes: string) {
    await this.pickMinutes('Another number');
    await this.page.getByRole('spinbutton', { name: 'Minutes' }).fill(minutes);
  }

  async pickDay(label: 'Today' | 'Yesterday') {
    await this.choice('Day you read together', label).click();
  }

  async done() {
    await this.page.getByRole('button', { name: 'Done!' }).click();
  }

  celebration() {
    return this.page.getByRole('heading', { name: /minutes together!/ });
  }

  async backToShelf() {
    await this.page.getByRole('link', { name: 'Back to my shelf' }).click();
  }

  problem(text: string | RegExp) {
    return this.page.getByRole('alert').filter({ hasText: text });
  }

  fieldError(text: string) {
    return this.page.locator('.field__error').filter({ hasText: text });
  }

  async tryAgain() {
    await this.page.getByRole('button', { name: 'Try again' }).click();
  }

  async breakSaving() {
    await this.page.route('**/api/together/sessions', (route) => route.abort());
  }

  async repairSaving() {
    await this.page.unroute('**/api/together/sessions');
  }

  async scrollsSideways() {
    return this.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  }
}
