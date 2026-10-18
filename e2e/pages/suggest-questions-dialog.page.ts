import type { Page } from '@playwright/test';

/** The Suggested questions dialog over Manage a book. */
export class SuggestQuestionsDialog {
  constructor(private readonly page: Page) {}

  dialog() {
    return this.page.getByRole('dialog', { name: 'Suggested questions' });
  }

  suggestions() {
    return this.dialog().getByRole('listitem');
  }

  /** The editable wording of suggestion `n`, counting from 1. */
  wording(n: number) {
    return this.dialog().getByLabel(`Suggestion ${n}`, { exact: true });
  }

  keepBox(n: number) {
    return this.dialog().getByLabel(`Keep suggestion ${n}`);
  }

  async keep(...numbers: number[]) {
    for (const n of numbers) await this.keepBox(n).check();
  }

  async reword(n: number, text: string) {
    await this.wording(n).fill(text);
  }

  addButton() {
    return this.dialog().getByRole('button', { name: /^Add( \d+)? questions?$/ });
  }

  async add() {
    await this.addButton().click();
  }


  failure() {
    return this.dialog().getByRole('alert');
  }

  /** Lets the first `saved` question through, then makes adding fail as a dropped connection would. */
  async breakAddingAfter(saved: number) {
    let adds = 0;
    await this.page.route('**/api/books/*/questions', (route) =>
      route.request().method() === 'POST' && ++adds > saved ? route.abort() : route.continue(),
    );
  }

  async repairAdding() {
    await this.page.unroute('**/api/books/*/questions');
  }
}
