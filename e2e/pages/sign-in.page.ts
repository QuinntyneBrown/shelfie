import type { Page } from '@playwright/test';

export class SignInPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/sign-in');
  }

  async signInWithPassword(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
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

  /** Enters a wrong PIN `count` times, waiting for each answer before the next try. */
  async failPin(count: number) {
    for (let attempt = 1; attempt <= count; attempt++) {
      await this.enterPin('9999');
      const left = 5 - attempt;
      await this.page.getByText(left > 0 ? new RegExp(`${left} tr(y|ies) left`) : /take a short break/).waitFor();
    }
  }

  lockNotice() {
    return this.page.getByRole('status').filter({ hasText: 'take a short break' });
  }

  digitButton(digit: string) {
    return this.page.getByRole('group', { name: 'PIN keypad' }).getByRole('button', { name: digit, exact: true });
  }

  /** Posts a PIN straight to the API, as a client that skips the keypad would. */
  async postPin(profileName: string, pin: string) {
    const profiles = await (await this.page.request.get('/api/auth/profiles')).json();
    const profile = profiles.find((p: { name: string }) => p.name === profileName);
    return this.page.request.post('/api/auth/pin', { data: { profileId: profile.id, pin } });
  }

  pinError() {
    return this.page.getByText(/That PIN didn’t match/);
  }

  digitsEntered(count: number) {
    return this.page.getByRole('status', { name: `${count} of 4 digits entered` });
  }
}
