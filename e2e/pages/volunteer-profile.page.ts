import type { Page } from '@playwright/test';

/** An approved volunteer's profile, as a parent sees it (`/directory/volunteers/:id`). */
export class VolunteerProfilePage {
  constructor(private readonly page: Page) {}

  async open(id: string) {
    await this.page.goto(`/directory/volunteers/${id}`);
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  ages() {
    return this.page.getByRole('main').getByText(/^Ages /);
  }

  contactCard() {
    return this.page.getByRole('region', { name: /^How to reach/ });
  }

  noVettingNotice() {
    return this.page.getByRole('status').filter({ hasText: 'Shelfie doesn’t vet volunteers' });
  }

  notAvailable() {
    return this.page.getByRole('heading', { name: 'This profile isn’t available' });
  }
}
