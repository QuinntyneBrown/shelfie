import type { Page } from '@playwright/test';

/** The Add a reader / Edit {name} dialog over Settings. */
export class EditReaderDialog {
  private requests = 0;

  constructor(private readonly page: Page) {
    page.on('request', (request) => {
      if (/\/api\/readers(\/|$)/.test(request.url()) && request.method() !== 'GET') this.requests++;
    });
  }

  requestCount() {
    return this.requests;
  }

  dialog() {
    return this.page.getByRole('dialog');
  }

  heading() {
    return this.dialog().getByRole('heading', { level: 2 });
  }

  nameField() {
    return this.dialog().getByLabel('Name', { exact: true });
  }

  colourGroup() {
    return this.dialog().getByRole('radiogroup', { name: 'Colour' });
  }

  usernameField() {
    return this.dialog().getByLabel('Username');
  }

  passwordField() {
    return this.dialog().getByRole('textbox', { name: /password/i });
  }

  async fill(reader: { name?: string; colour?: string; username?: string; password?: string }) {
    if (reader.name !== undefined) await this.nameField().fill(reader.name);
    if (reader.colour) await this.dialog().getByRole('radio', { name: reader.colour }).check({ force: true });
    if (reader.username !== undefined) await this.usernameField().fill(reader.username);
    if (reader.password !== undefined) await this.passwordField().fill(reader.password);
  }

  async save() {
    await this.dialog().getByRole('button', { name: /Add reader|Save changes/ }).click();
  }

  async cancel() {
    await this.dialog().getByRole('button', { name: 'Cancel' }).click();
  }

  problemSummary() {
    return this.dialog().getByRole('alert').filter({ hasText: /Fix \d+ things?/ });
  }

  failure() {
    return this.dialog().getByRole('alert').filter({ hasText: /wasn’t (added|saved)/ });
  }

  async tryAgain() {
    await this.dialog().getByRole('button', { name: 'Try again' }).click();
  }

  async breakSaving() {
    await this.page.route('**/api/readers*', (route) => route.abort());
  }

  async repairSaving() {
    await this.page.unroute('**/api/readers*');
  }
}
