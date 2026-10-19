import type { Page } from '@playwright/test';

/** The "Send feedback" dialog, opened from the account menu: a face for the score, the kind and a message. */
export class SendFeedbackDialog {
  constructor(private readonly page: Page) {}

  dialog() {
    return this.page.getByRole('dialog', { name: 'Send feedback' });
  }

  /** The score's radio group, labelled with its question. */
  scoreGroup() {
    return this.dialog().getByRole('radiogroup');
  }

  /** One face, by its word: "Not fun", "A bit meh", "Okay", "Good" or "Love it". */
  face(name: string) {
    return this.dialog().getByRole('radio', { name });
  }

  async pickFace(name: string) {
    await this.face(name).check();
  }

  kind(name: 'How it feels' | 'An idea') {
    return this.dialog().getByRole('button', { name });
  }

  async chooseKind(name: 'How it feels' | 'An idea') {
    await this.kind(name).click();
  }

  message() {
    return this.dialog().getByRole('textbox');
  }

  async write(text: string) {
    await this.message().fill(text);
  }

  sendButton() {
    return this.dialog().getByRole('button', { name: 'Send', exact: true });
  }

  async send() {
    await this.sendButton().click();
  }

  async cancel() {
    await this.dialog().getByRole('button', { name: 'Cancel' }).click();
  }

  /** The dialog's alerts: the "Fix N things" summary or the failure banner. */
  banner() {
    return this.dialog().getByRole('alert').filter({ hasText: /Fix \d|wasn’t sent/ });
  }

  async tryAgain() {
    await this.dialog().getByRole('button', { name: 'Try again' }).click();
  }

  thanks() {
    return this.page.getByRole('status').filter({ hasText: 'Thanks! We read every note.' });
  }

  async breakSending() {
    await this.page.route('**/api/feedback', (route) => route.abort());
  }

  async repairSending() {
    await this.page.unroute('**/api/feedback');
  }

  /** Makes the API answer as if too many notes had been sent. */
  async limitSending() {
    await this.page.route('**/api/feedback', (route) =>
      route.fulfill({ status: 429, contentType: 'application/json', headers: { 'Retry-After': '600' }, body: '{"type":"too-many-attempts"}' }),
    );
  }

  /** Holds sending until the returned function is called. */
  async holdSending() {
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    await this.page.route('**/api/feedback', async (route) => {
      await released;
      await route.continue();
    });
    return release;
  }

  private sends = 0;

  watchSending() {
    this.page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/api/feedback')) this.sends++;
    });
  }

  sendCount() {
    return this.sends;
  }
}
