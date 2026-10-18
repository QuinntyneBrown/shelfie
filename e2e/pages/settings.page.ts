import type { Page } from '@playwright/test';

export class SettingsPage {
  constructor(private readonly page: Page) {}

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  yourName() {
    return this.page.getByLabel('Your name');
  }

  // Role queries, so the fields of a closed (hidden) dialog never match.
  username() {
    return this.page.getByRole('textbox', { name: 'Username' });
  }

  email() {
    return this.page.getByRole('textbox', { name: 'E-mail address', exact: true });
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

  appearanceChoice(label: 'Match the device' | 'Always light' | 'Always dark') {
    return this.page.getByRole('radio', { name: label });
  }

  saveButton() {
    return this.page.getByRole('button', { name: 'Save settings' });
  }

  banner() {
    return this.page.getByRole('status').filter({ hasText: 'Saved' });
  }

  async signOut() {
    await this.page.getByRole('button', { name: 'Sign out' }).click();
    await this.page.waitForURL('**/sign-in');
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

  /** "Add a photo", or "Change photo" once there is one, in Your account. */
  photoButton() {
    return this.page.getByRole('region', { name: 'Your account' }).getByRole('button', { name: /Add a photo|Change photo/ });
  }

  async openPhotoDialog() {
    await this.photoButton().click();
  }

  /** The photo in the Your account row, when there is one. */
  ownPhoto() {
    return this.page.getByRole('region', { name: 'Your account' }).locator('img');
  }

  /** The photo in a reader's row, when she has one. */
  readerPhoto(name: string) {
    return this.reader(name).locator('img');
  }

  /** Asks the API for the settings, as a client that skips the page would. */
  getViaApi() {
    return this.page.request.get('/api/settings');
  }

  rewards() {
    return this.page.getByRole('region', { name: 'Rewards' });
  }

  /** A row of the Rewards list. */
  galleryReward(name: string) {
    return this.rewards().getByRole('listitem').filter({ hasText: name });
  }

  noRewardsMessage() {
    return this.rewards().getByText('No rewards yet. Add one and Nia can pick it to read toward.');
  }

  async addGalleryReward() {
    await this.page.getByRole('button', { name: 'Add a reward' }).click();
  }

  async editGalleryReward(name: string) {
    await this.rewards().getByRole('button', { name: `Edit ${name}` }).click();
  }

  async removeGalleryReward(name: string) {
    await this.rewards().getByRole('button', { name: `Remove ${name}` }).click();
  }

  /** True when the page is wider than the window, so it scrolls sideways. */
  scrollsSideways() {
    return this.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  }
}
