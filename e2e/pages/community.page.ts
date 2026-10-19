import type { Page } from '@playwright/test';

/** One community: its join code, its reading goal, its families and Leave. */
export class CommunityPage {
  constructor(private readonly page: Page) {}

  async open(id: string) {
    await this.page.goto(`/communities/${id}`);
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  /** The community's id, from the address of its page. */
  id() {
    return new URL(this.page.url()).pathname.split('/').pop()!;
  }

  /** The code as it is shown, ABCD-EFGH. */
  async joinCode() {
    return (await this.page.locator('.join-code__value').textContent())!.trim();
  }

  async copyCode() {
    await this.page.getByRole('button', { name: 'Copy code' }).click();
  }

  copiedButton() {
    return this.page.getByRole('button', { name: 'Copied!' });
  }

  families() {
    return this.page.getByRole('region', { name: 'Families' }).getByRole('listitem');
  }

  family(name: string) {
    return this.families().filter({ hasText: name });
  }

  goal() {
    return this.page.getByRole('region', { name: 'Reading goal' }).locator('.goal-card');
  }

  async setGoal() {
    await this.page.getByRole('region', { name: 'Reading goal' }).getByRole('button', { name: 'Set a reading goal' }).click();
  }

  editGoalButton() {
    return this.page.getByRole('button', { name: 'Edit the community reading goal' });
  }

  async leave() {
    await this.page.getByRole('button', { name: /^Leave / }).click();
  }

  notFound() {
    return this.page.getByRole('heading', { name: 'We can’t find that community' });
  }

  toast(text: string) {
    return this.page.getByRole('status').getByText(text);
  }
}
