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

  /** The live status line, banner or empty state that says what the dialog is doing. */
  status() {
    return this.dialog().getByRole('status');
  }

  emptyState() {
    return this.dialog().getByRole('heading', { name: 'No new ideas this time' });
  }

  async askAgain() {
    await this.dialog().getByRole('button', { name: 'Ask again' }).first().click();
  }

  tryAgainButton() {
    return this.failure().getByRole('button', { name: 'Try again' });
  }

  async tryAgain() {
    await this.tryAgainButton().click();
  }

  async close() {
    await this.dialog().getByRole('button', { name: /^(Close|Cancel)$/ }).click();
  }

  /** Holds the request for suggestions until the returned function is called. */
  async holdSuggestions() {
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    await this.page.route('**/api/books/*/question-suggestions', async (route) => {
      await released;
      await route.continue();
    });
    return release;
  }

  /** Answers as a server without an AI key does. */
  async switchOffSuggestions() {
    await this.page.route('**/api/books/*/question-suggestions', (route) =>
      route.fulfill({ status: 503, json: { type: 'suggestions-unavailable' } }),
    );
  }
}
