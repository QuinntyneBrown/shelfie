import type { Page } from '@playwright/test';
import { coverPictureRoute } from '../support/covers';

export class AddBookPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/add-book');
  }

  heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  titleField() {
    return this.page.getByLabel('Title');
  }

  authorField() {
    return this.page.getByLabel('Author');
  }

  chaptersField() {
    return this.page.getByRole('spinbutton', { name: 'Chapters' });
  }

  async fill(book: { title: string; author?: string; chapters: number; colour?: string; sticker?: string }) {
    await this.titleField().fill(book.title);
    if (book.author) await this.authorField().fill(book.author);
    await this.chaptersField().fill(String(book.chapters));
    if (book.colour) await this.page.getByRole('radio', { name: book.colour, exact: true }).check();
    if (book.sticker) await this.page.getByRole('radio', { name: book.sticker, exact: true }).check();
  }

  private requests = 0;

  watchRequests() {
    this.page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/api/books')) this.requests++;
    });
  }

  requestCount() {
    return this.requests;
  }

  problemSummary() {
    return this.page.getByRole('alert').filter({ hasText: /Fix \d+ things?/ });
  }

  async typeMoreInTitle(text: string) {
    await this.titleField().pressSequentially(text);
  }

  async typeMoreInAuthor(text: string) {
    await this.authorField().pressSequentially(text);
  }

  async breakSaving() {
    await this.page.route('**/api/books', (route) => (route.request().method() === 'POST' ? route.abort() : route.continue()));
  }

  async repairSaving() {
    await this.page.unroute('**/api/books');
  }

  failure() {
    return this.page.getByRole('alert').filter({ hasText: 'The book wasn’t saved' });
  }

  async tryAgain() {
    await this.page.getByRole('button', { name: 'Try again' }).click();
  }

  preview() {
    return this.page.getByRole('complementary', { name: 'Cover preview' });
  }

  previewCover() {
    return this.preview().locator('.cover');
  }

  previewPicture() {
    return this.previewCover().locator('img');
  }

  /** Whether the preview's picture has loaded and has pixels to show. */
  async previewPictureLoaded() {
    return this.previewPicture().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
  }

  private picker() {
    return this.page.getByRole('group', { name: 'Cover picture (optional)' });
  }

  /** The file input behind "Add a picture" or "Change picture". */
  pictureChooser() {
    return this.picker().getByLabel(/Add a picture|Change picture/);
  }

  removePictureButton() {
    return this.picker().getByRole('button', { name: 'Remove picture' });
  }

  async choosePicture(file: string) {
    await this.pictureChooser().setInputFiles(file);
  }

  async chooseNotAPicture() {
    await this.pictureChooser().setInputFiles({ name: 'story.txt', mimeType: 'text/plain', buffer: Buffer.from('Once upon a time') });
  }

  async chooseTooLargePicture() {
    await this.pictureChooser().setInputFiles({ name: 'huge.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
  }

  async removePicture() {
    await this.removePictureButton().click();
  }

  pictureError() {
    return this.picker().getByRole('alert');
  }

  private pictureUploads = 0;

  watchPictureUploads() {
    this.page.on('request', (request) => {
      if (request.method() === 'PUT' && /\/api\/books\/[^/]+\/cover$/.test(request.url())) this.pictureUploads++;
    });
  }

  pictureUploadCount() {
    return this.pictureUploads;
  }

  async breakPictureUploads() {
    await this.page.route(coverPictureRoute, (route) => (route.request().method() === 'PUT' ? route.abort() : route.continue()));
  }

  /** Picks a cover colour or sticker by pressing its swatch, as a finger would. */
  async pick(name: string) {
    await this.page.locator('label').filter({ has: this.page.getByRole('radio', { name, exact: true }) }).click();
  }

  async submit() {
    await this.page.getByRole('button', { name: 'Add to my shelf' }).click();
  }

  // The title lookup: the Title field is a combobox whose matches drop down under it.

  async typeTitle(text: string) {
    await this.titleField().fill(text);
  }

  async pressInTitle(key: string) {
    await this.titleField().press(key);
  }

  matchList() {
    return this.page.getByRole('listbox', { name: 'Matching books' });
  }

  matches() {
    return this.matchList().getByRole('option');
  }

  match(title: string) {
    return this.matches().filter({ has: this.page.getByText(title, { exact: true }) });
  }

  activeMatch() {
    return this.matchList().locator('[role="option"][aria-selected="true"]');
  }

  async pickMatch(title: string) {
    await this.match(title).click();
  }

  matchPicture(title: string) {
    return this.match(title).locator('img');
  }

  /** Whether the match's small cover has loaded and has pixels to show. */
  async matchPictureLoaded(title: string) {
    return this.matchPicture(title).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
  }

  suggestedBadge(title: string) {
    return this.match(title).getByText('Suggested');
  }

  suggestedNote() {
    return this.page.getByText('Not in the book catalogue, so these are guesses. Check them before you add the book.');
  }

  /** The note under the Title while looking up, with no matches, or when the lookup failed. */
  lookupNote() {
    return this.page.getByRole('status').filter({ hasText: /Looking that up|No matches|couldn’t look that up/ });
  }

  /** What a screen reader is told about the list: the count, or the fill after a pick. */
  lookupAnnouncement() {
    return this.page.getByRole('status').filter({ hasText: /matches\.|suggestions\.|Filled in from the match/ });
  }

  private lookups = 0;

  watchLookups() {
    this.page.on('request', (request) => {
      if (request.method() === 'GET' && request.url().includes('/api/books/search?')) this.lookups++;
    });
  }

  lookupCount() {
    return this.lookups;
  }

  async breakLookups() {
    await this.page.route('**/api/books/search?*', (route) => route.abort());
  }

  // The cover gallery: "More covers" opens a dialog of the other covers the catalogue has for the picked book.

  moreCoversButton() {
    return this.page.getByRole('button', { name: 'More covers' });
  }

  async openMoreCovers() {
    await this.moreCoversButton().click();
  }

  coversDialog() {
    return this.page.getByRole('dialog', { name: 'Pick a cover' });
  }

  /** Waits for the dialog's opening animation to finish, so colours are read at rest; a cancelled one counts as done. */
  async coversSettled() {
    await this.page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
          .map((animation) => animation.finished.catch(() => undefined)),
      ),
    );
  }

  galleryCovers() {
    return this.coversDialog().getByRole('radio');
  }

  galleryCover(n: number, total: number) {
    return this.coversDialog().getByRole('radio', { name: `Cover ${n} of ${total}` });
  }

  async chooseGalleryCover(n: number, total: number) {
    await this.galleryCover(n, total).check({ force: true });
  }

  async useThisCover() {
    await this.coversDialog().getByRole('button', { name: 'Use this cover' }).click();
  }

  async cancelCovers() {
    await this.coversDialog().getByRole('button', { name: 'Cancel' }).click();
  }

  async closeCovers() {
    await this.coversDialog().getByRole('button', { name: 'Close' }).click();
  }

  noOtherCovers() {
    return this.coversDialog().getByText('No other covers for this book.');
  }

  coversFailure() {
    return this.coversDialog().getByRole('alert').filter({ hasText: /Shelfie couldn’t get the covers\.\s*You can still add the book\./ });
  }

  private pickedCoverIds: string[] = [];

  /** Remembers each catalogue cover the page fetched as a file (a pick), not those shown as pictures. */
  watchPickedCovers() {
    this.page.on('request', (request) => {
      const id = request.url().match(/\/api\/books\/search\/covers\/(\d+)$/)?.[1];
      if (id && request.resourceType() !== 'image') this.pickedCoverIds.push(id);
    });
  }

  pickedCovers() {
    return [...this.pickedCoverIds];
  }

  /** The shortest gallery tile, in CSS pixels, either way round. */
  async smallestGalleryTile() {
    const sizes = await this.galleryCovers().evaluateAll((radios) =>
      radios.map((radio) => {
        const box = radio.closest('label')!.getBoundingClientRect();
        return Math.min(box.width, box.height);
      }),
    );
    return Math.min(...sizes);
  }

  async scrollsSideways() {
    return this.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  }

  /** Whether the dropped list spans exactly the Title field's width. */
  async listAsWideAsTitle() {
    const [field, list] = await Promise.all([this.titleField().boundingBox(), this.matchList().boundingBox()]);
    return !!field && !!list && Math.abs(field.width - list.width) < 12 && Math.abs(field.x - list.x) < 12;
  }

  /** The shortest row in the dropped list, in CSS pixels. */
  async shortestMatchHeight() {
    const boxes = await this.matches().evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height));
    return Math.min(...boxes);
  }

  /** Opens Add a book filled in from a directory catalogue book, as an author's Add to shelf does. */
  async openFromCatalogue(catalogueBookId: string) {
    await this.page.goto(`/add-book?catalogueBook=${catalogueBookId}`);
  }

  unavailableNote() {
    return this.page.getByText('That book isn’t available any more.');
  }
}
