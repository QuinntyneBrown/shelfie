import type { Page } from '@playwright/test';

export class SettingsPage {
  constructor(private readonly page: Page) {}

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  yourName() {
    return this.page.getByLabel('Your name');
  }

  username() {
    return this.page.getByLabel('Username');
  }

  email() {
    return this.page.getByLabel('E-mail address');
  }

  async open() {
    await this.page.goto('/settings');
  }

  async setYourName(name: string) {
    await this.yourName().fill(name);
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

  async setNewPassword(password: string, again = password) {
    await this.newPasswordField().fill(password);
    await this.confirmField().fill(again);
  }

  async setCurrentPassword(password: string) {
    await this.page.getByRole('textbox', { name: 'Current password' }).fill(password);
  }

  newPasswordField() {
    return this.page.getByRole('textbox', { name: 'New password' });
  }

  confirmField() {
    return this.page.getByRole('textbox', { name: 'Type it again' });
  }

  failureBanner() {
    return this.page.getByRole('alert').filter({ hasText: 'Couldn’t save' });
  }

  async setEmail(email: string) {
    await this.email().fill(email);
  }

  async breakSaving() {
    await this.page.route('**/api/settings', (route) => (route.request().method() === 'PATCH' ? route.abort() : route.continue()));
  }

  async repairSaving() {
    await this.page.unroute('**/api/settings');
  }

  async breakLoading() {
    await this.page.route('**/api/settings', (route) => (route.request().method() === 'GET' ? route.abort() : route.continue()));
  }

  async repairLoading() {
    await this.page.unroute('**/api/settings');
  }

  loadFailure() {
    return this.page.getByRole('heading', { name: 'Settings didn’t load' });
  }

  async tryLoadingAgain() {
    await this.page.getByRole('button', { name: 'Try again' }).click();
  }

  async chooseAppearance(label: 'Match the device' | 'Always light' | 'Always dark') {
    await this.page.getByRole('radio', { name: label }).check();
  }

  async save() {
    await this.page.getByRole('button', { name: 'Save settings' }).click();
  }

  banner() {
    return this.page.getByRole('status').filter({ hasText: 'Saved' });
  }

  async signOut() {
    await this.page.getByRole('button', { name: 'Sign out' }).click();
  }

  /** A row of the Parents list: a parent or a pending invite. */
  parent(text: string) {
    return this.page.getByRole('region', { name: 'Parents' }).getByRole('listitem').filter({ hasText: text });
  }

  async inviteParent() {
    await this.page.getByRole('button', { name: 'Invite a parent' }).click();
  }

  async sendInviteAgain(email: string) {
    await this.parent(email).getByRole('button', { name: 'Send again' }).click();
  }

  async addReader() {
    await this.page.getByRole('button', { name: 'Add a reader' }).click();
  }

  async editReader(name: string) {
    await this.page.getByRole('button', { name: `Edit ${name}` }).click();
  }

  toast(text: string) {
    return this.page.getByRole('status').getByText(text);
  }

  reader(name: string) {
    return this.page.getByRole('region', { name: 'Readers' }).getByRole('listitem').filter({ hasText: name });
  }

  /** Asks the API for the settings, as a client that skips the page would. */
  getViaApi() {
    return this.page.request.get('/api/settings');
  }
}
