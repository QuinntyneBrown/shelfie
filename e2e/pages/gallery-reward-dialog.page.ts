import type { Page } from '@playwright/test';

/** The Add a reward / Edit {name} dialog over Settings. */
export class GalleryRewardDialog {
  private requests = 0;

  constructor(private readonly page: Page) {
    page.on('request', (request) => {
      if (/\/api\/gallery-rewards(\/|$)/.test(request.url()) && request.method() !== 'GET') this.requests++;
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
    return this.dialog().getByRole('textbox', { name: 'The reward' });
  }

  descriptionField() {
    return this.dialog().getByRole('textbox', { name: 'Description (optional)' });
  }

  targetField() {
    return this.dialog().getByRole('spinbutton', { name: 'Books to finish' });
  }

  /** The Pictures group: thumbnails, their buttons and Add a picture. */
  pictures() {
    return this.dialog().getByRole('group', { name: /^Pictures/ });
  }

  /** Every thumbnail, in order. */
  pictureItems() {
    return this.pictures().getByRole('listitem');
  }

  /** The nth thumbnail, counting from 1. */
  picture(n: number) {
    return this.pictureItems().nth(n - 1);
  }

  pictureImage(n: number) {
    return this.picture(n).getByRole('img');
  }

  /** The thumbnail marked Featured. */
  featuredPicture() {
    return this.pictureItems().filter({ has: this.page.getByText('Featured', { exact: true }) });
  }

  featuredPictureImage() {
    return this.featuredPicture().getByRole('img');
  }

  pictureChooser() {
    return this.pictures().getByLabel('Add a picture');
  }

  /** Help under the pictures: the rules, the upload in progress or why Add a picture is off. */
  pictureHelp() {
    return this.pictures().getByRole('status');
  }

  async removePicture(n: number) {
    await this.pictures().getByRole('button', { name: `Remove picture ${n}` }).click();
  }

  async makeFeatured(n: number) {
    await this.pictures().getByRole('button', { name: `Make picture ${n} featured` }).click();
  }

  makeFeaturedButtons() {
    return this.pictures().getByRole('button', { name: /^Make picture \d+ featured$/ });
  }

  async choosePicture(file: string) {
    await this.pictureChooser().setInputFiles(file);
  }

  async fill(reward: { name?: string; description?: string; target?: string }) {
    if (reward.name !== undefined) await this.nameField().fill(reward.name);
    if (reward.description !== undefined) await this.descriptionField().fill(reward.description);
    if (reward.target !== undefined) await this.targetField().fill(reward.target);
  }

  async save() {
    await this.dialog().getByRole('button', { name: /Add reward|Save changes/ }).click();
  }

  problemSummary() {
    return this.dialog().getByRole('alert').filter({ hasText: /Fix \d+ things?/ });
  }

  failure() {
    return this.dialog().getByRole('alert').filter({ hasText: 'wasn’t saved' });
  }

  async tryAgain() {
    await this.dialog().getByRole('button', { name: 'Try again' }).click();
  }

  async breakSaving() {
    await this.page.route('**/api/gallery-rewards**', (route) => (route.request().method() === 'GET' ? route.continue() : route.abort()));
  }

  async repairSaving() {
    await this.page.unroute('**/api/gallery-rewards**');
  }
}
