import type { Page } from '@playwright/test';

/** The Start a challenge dialog, over Review's Challenges tab. */
export class StartChallengeDialog {
  private posts = 0;

  constructor(private readonly page: Page) {
    page.on('request', (request) => {
      if (request.url().endsWith('/api/challenges') && request.method() === 'POST') this.posts++;
    });
  }

  postCount() {
    return this.posts;
  }

  dialog() {
    return this.page.getByRole('dialog', { name: 'Start a challenge' });
  }

  nameField() {
    return this.dialog().getByRole('textbox', { name: 'Name' });
  }

  goalField() {
    return this.dialog().getByRole('spinbutton', { name: 'Goal' });
  }

  readerSwitch(name: string) {
    return this.dialog().getByRole('group', { name: 'Who takes part' }).getByRole('checkbox', { name });
  }

  choice(group: 'What counts' | 'How long', label: string) {
    return this.dialog().getByRole('group', { name: group }).getByRole('button', { name: label });
  }

  async fill({ name, goal, measure, length }: { name?: string; goal?: string; measure?: string; length?: string }) {
    if (name !== undefined) await this.nameField().fill(name);
    if (goal !== undefined) await this.goalField().fill(goal);
    if (measure) await this.choice('What counts', measure).click();
    if (length) await this.choice('How long', length).click();
  }

  async leaveOut(reader: string) {
    await this.readerSwitch(reader).uncheck();
  }

  async start() {
    await this.dialog().getByRole('button', { name: 'Start the challenge' }).click();
  }

  failure() {
    return this.dialog().getByRole('alert').filter({ hasText: 'The challenge wasn’t started' });
  }

  async breakStarting() {
    await this.page.route('**/api/challenges', (route) => (route.request().method() === 'POST' ? route.abort() : route.continue()));
  }
}
