import type { Page } from '@playwright/test';

/** An author's or volunteer's own profile (`/me`). */
export class MyProfilePage {
  private saves = 0;

  constructor(private readonly page: Page) {
    page.on('request', (request) => {
      if (request.method() === 'PUT' && request.url().endsWith('/api/me')) this.saves++;
    });
  }

  saveCount() {
    return this.saves;
  }

  async open() {
    await this.page.goto('/me');
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  /** The navigation links the shell shows, top bar or tab bar, whichever is visible. */
  navigation() {
    return this.page.getByRole('navigation', { name: /^Primary/ }).filter({ visible: true }).getByRole('link');
  }

  /** The banner saying whether parents can see the profile. */
  status() {
    return this.page.getByRole('status').filter({ hasText: /Waiting for approval|Parents can see your profile|Hidden by Shelfie/ });
  }

  nameField() {
    return this.page.getByLabel('Your name');
  }

  aboutField() {
    return this.page.getByRole('textbox', { name: 'About you' });
  }

  websiteField() {
    return this.page.getByLabel(/^Website/);
  }

  agesField() {
    return this.page.getByLabel('Ages you help with');
  }

  contactField() {
    return this.page.getByLabel('How parents can reach you');
  }

  async save() {
    await this.page.getByRole('button', { name: 'Save profile' }).click();
  }

  savedToast() {
    return this.page.getByRole('status').filter({ hasText: 'Profile saved' });
  }

  problemSummary() {
    return this.page.getByRole('alert').filter({ hasText: /Fix \d+ things?/ });
  }

  failure() {
    return this.page.getByRole('alert').filter({ hasText: 'Your changes weren’t saved' });
  }

  async tryAgain() {
    await this.page.getByRole('button', { name: 'Try again' }).click();
  }

  async breakSaving() {
    await this.page.route('**/api/me', (route) => (route.request().method() === 'PUT' ? route.abort() : route.continue()));
  }

  async repairSaving() {
    await this.page.unroute('**/api/me');
  }

  /** Picks a file behind "Choose a photo" or "Choose another" on the page; it uploads at once. */
  async choosePhoto(file: string) {
    await this.page.getByRole('main').getByLabel(/Choose a photo|Choose another/).setInputFiles(file);
  }

  async removePhoto() {
    await this.page.getByRole('main').getByRole('button', { name: 'Remove photo' }).click();
  }
}
