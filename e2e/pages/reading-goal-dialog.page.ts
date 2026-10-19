import type { Page } from '@playwright/test';

/** Set or edit a reading goal, for the household or a community. */
export class ReadingGoalDialog {
  constructor(private readonly page: Page) {}

  dialog() {
    return this.page.getByRole('dialog', { name: /reading goal/ });
  }

  async save(target: number | string, endsOn: string) {
    await this.dialog().getByLabel('How many books?').fill(String(target));
    await this.dialog().getByLabel('Finish by').fill(endsOn);
    await this.dialog().getByRole('button', { name: 'Save goal' }).click();
  }

  problemSummary() {
    return this.dialog().getByText(/^Fix \d thing/);
  }
}
