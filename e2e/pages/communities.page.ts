import type { Page } from '@playwright/test';

/** The parent's Community page: the household's reading goal and its communities. */
export class CommunitiesPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/communities');
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  emptyState() {
    return this.page.getByRole('heading', { name: 'Read together with other families' });
  }

  community(name: string) {
    return this.page.getByRole('region', { name: 'Your communities' }).getByRole('listitem').filter({ hasText: name });
  }

  async openCommunity(name: string) {
    await this.community(name).getByRole('link', { name: `Open ${name}` }).click();
  }

  async startCommunity() {
    await this.page.getByRole('button', { name: 'Start a community' }).first().click();
  }

  async joinWithCode() {
    await this.page.getByRole('button', { name: 'Join with a code' }).first().click();
  }

  /** "Our reading goal": the household's goal card, or "No reading goal yet". */
  householdGoal() {
    return this.page.getByRole('region', { name: 'Our reading goal' }).locator('.goal-card');
  }

  async setHouseholdGoal() {
    await this.page.getByRole('region', { name: 'Our reading goal' }).getByRole('button', { name: 'Set a reading goal' }).click();
  }

  async editHouseholdGoal() {
    await this.page.getByRole('button', { name: 'Edit our reading goal' }).click();
  }

  async removeHouseholdGoal() {
    await this.page.getByRole('button', { name: 'Remove our reading goal' }).click();
  }

  toast(text: string) {
    return this.page.getByRole('status').getByText(text);
  }
}
