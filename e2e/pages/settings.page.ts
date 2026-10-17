import type { Page } from '@playwright/test';

export class SettingsPage {
  constructor(private readonly page: Page) {}

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  readerName() {
    return this.page.getByLabel('Name', { exact: true });
  }

  grownUpName() {
    return this.page.getByLabel('Name Nia sees');
  }

  email() {
    return this.page.getByLabel('E-mail address');
  }

  async open() {
    await this.page.goto('/settings');
  }

  async setReaderName(name: string) {
    await this.readerName().fill(name);
  }

  async chooseReaderColour(colour: string) {
    await this.page.getByRole('radio', { name: colour }).check({ force: true });
  }

  async setGrownUpName(name: string) {
    await this.grownUpName().fill(name);
  }

  async setPin(pin: string) {
    await this.page.getByLabel('New 4-digit PIN').fill(pin);
  }

  private saveRequests = 0;

  watchSaves() {
    this.page.on('request', (request) => {
      if (request.method() === 'PATCH' && request.url().endsWith('/api/settings')) this.saveRequests++;
    });
  }

  saveRequestCount() {
    return this.saveRequests;
  }

  problemSummary() {
    return this.page.getByRole('alert').filter({ hasText: /Fix \d+ thing/ });
  }

  pinField() {
    return this.page.getByLabel('New 4-digit PIN');
  }

  async setNewPassword(password: string, again = password) {
    await this.page.getByLabel('New password').fill(password);
    await this.page.getByLabel('Type it again').fill(again);
  }

  async setCurrentPassword(password: string) {
    await this.page.getByLabel('Current password').fill(password);
  }

  newPasswordField() {
    return this.page.getByLabel('New password');
  }

  confirmField() {
    return this.page.getByLabel('Type it again');
  }

  failureBanner() {
    return this.page.getByRole('alert').filter({ hasText: 'Couldn’t save' });
  }

  async setEmail(email: string) {
    await this.email().fill(email);
  }

  async save() {
    await this.page.getByRole('button', { name: 'Save settings' }).click();
  }

  banner() {
    return this.page.getByRole('status').filter({ hasText: 'Saved' });
  }

  /** Asks the API for the settings, as a client that skips the page would. */
  getViaApi() {
    return this.page.request.get('/api/settings');
  }
}
