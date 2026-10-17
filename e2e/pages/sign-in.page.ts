import type { Page } from '@playwright/test';

export class SignInPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/sign-in');
  }

  async choose(name: string) {
    await this.page.getByRole('button', { name: new RegExp(name) }).click();
    await this.page.getByRole('group', { name: 'PIN keypad' }).waitFor();
  }

  async enterPin(pin: string) {
    const keypad = this.page.getByRole('group', { name: 'PIN keypad' });
    for (const digit of pin) await keypad.getByRole('button', { name: digit, exact: true }).click();
  }

  async typePin(text: string) {
    await this.page.keyboard.type(text);
  }

  async deleteLastDigit() {
    await this.page.getByRole('button', { name: 'Delete last digit' }).click();
  }

  pinError() {
    return this.page.getByText(/That PIN didn’t match/);
  }

  digitsEntered(count: number) {
    return this.page.getByRole('status', { name: `${count} of 4 digits entered` });
  }
}
