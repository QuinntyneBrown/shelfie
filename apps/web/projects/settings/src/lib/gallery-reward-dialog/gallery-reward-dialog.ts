import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Banner, Dialog, PHOTO_ERRORS, PictureItem, PictureList, TextField, Textarea } from 'components';
import { ApiError, ToastService } from 'core';
import { GalleryReward, GalleryRewardInput, GalleryRewardsApi } from '../gallery-rewards-api';

/** A thumbnail in the dialog: a stored picture, or a chosen file not stored yet. */
interface DialogPicture extends PictureItem {
  /** The stored picture's id; null until it is stored. */
  id: string | null;
  file?: File;
}

const pictureOf = (reward: GalleryReward): DialogPicture[] =>
  reward.pictures.map((p) => ({ id: p.id, url: p.url, featured: p.url === reward.featuredPicture }));

/**
 * Adds a reward to the gallery, or edits one; saves through the API and reports the saved reward.
 * Editing, each picture change is stored at once and reported as `changed` (ADR-0011).
 */
@Component({
  selector: 'sh-gallery-reward-dialog',
  imports: [Banner, Dialog, PictureList, TextField, Textarea],
  templateUrl: './gallery-reward-dialog.html',
  styleUrl: './gallery-reward-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GalleryRewardDialog {
  private readonly api = inject(GalleryRewardsApi);
  private readonly toasts = inject(ToastService);

  readonly open = input(false);
  /** The reward being edited, or null to add one. */
  readonly editing = input<GalleryReward | null>(null);
  /** Who picks from the gallery, for the help text. */
  readonly readerName = input.required<string>();
  readonly saved = output<GalleryReward>();
  /** The reward after a picture change, which is stored before any save. */
  readonly changed = output<GalleryReward>();
  readonly closed = output<void>();

  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly target = signal('');
  protected readonly nameError = signal<string | null>(null);
  protected readonly targetError = signal<string | null>(null);
  protected readonly descriptionError = signal<string | null>(null);
  protected readonly problems = computed(() =>
    [
      this.nameError() && 'Name the reward',
      this.targetError() && 'Use 1 to 20 books',
      this.descriptionError() && 'Shorten the description',
    ].filter((p): p is string => !!p),
  );
  protected readonly pictures = signal<DialogPicture[]>([]);
  protected readonly pictureError = signal<string | null>(null);
  /** The stored reward: the one being edited, or the one just added. */
  protected readonly current = signal<GalleryReward | null>(null);
  protected readonly pictureHelp = computed(() =>
    this.current()
      ? 'Up to 6. The featured one shows on ' + this.readerName() + '’s shelf. JPEG, PNG or WebP, up to 5 MB each.'
      : 'Up to 6. They upload once the reward is added. JPEG, PNG or WebP, up to 5 MB each.',
  );
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  protected readonly heading = computed(() => {
    const reward = this.current();
    return reward ? `Edit ${reward.name}` : 'Add a reward';
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const reward = this.editing();
      this.current.set(reward);
      this.name.set(reward?.name ?? '');
      this.description.set(reward?.description ?? '');
      this.pictures.set(reward ? pictureOf(reward) : []);
      this.pictureError.set(null);
      this.target.set(reward ? String(reward.target) : '');
      this.nameError.set(null);
      this.descriptionError.set(null);
      this.targetError.set(null);
      this.failed.set(false);
    });
  }

  /** Editing, uploads the file at once; adding, keeps it until the reward is saved (ADR-0011). */
  protected async addPicture(file: File) {
    this.pictureError.set(null);
    const first = this.pictures().length === 0;
    this.pictures.update((list) => [
      ...list,
      { id: null, url: URL.createObjectURL(file), featured: !this.current() && first, file },
    ]);
    if (this.current()) await this.upload(file);
  }

  protected async retryPicture(index: number) {
    const file = this.pictures()[index]?.file;
    if (file) await this.upload(file);
  }

  protected async removePicture(index: number) {
    const picture = this.pictures()[index];
    if (!picture) return;
    if (!picture.id) {
      // Not stored: it only leaves the list, and the first one left takes over a featured mark.
      const rest = this.pictures().filter((p) => p !== picture);
      this.pictures.set(picture.featured && !this.current() ? rest.map((p, i) => ({ ...p, featured: i === 0 })) : rest);
      return;
    }
    await this.change(() => this.api.removePicture(this.current()!.id, picture.id!));
  }

  protected async featurePicture(index: number) {
    const picture = this.pictures()[index];
    if (!picture) return;
    if (!picture.id) {
      this.pictures.update((list) => list.map((p) => ({ ...p, featured: p === picture })));
      return;
    }
    await this.change(() => this.api.featurePicture(this.current()!.id, picture.id!));
  }

  /**
   * Sends one chosen file and answers the stored picture's id, or null when it was not stored. On
   * success the list becomes the stored pictures plus the files still waiting or failed.
   */
  private async upload(file: File): Promise<string | null> {
    this.mark(file, 'uploading');
    const before = new Set(this.current()!.pictures.map((p) => p.id));
    try {
      const reward = await this.api.addPicture(this.current()!.id, file);
      this.stored(reward, file);
      return reward.pictures.find((p) => !before.has(p.id))?.id ?? null;
    } catch (e) {
      if (e instanceof ApiError && (e.type === 'photo-type' || e.type === 'photo-too-large')) {
        this.pictures.update((list) => list.filter((p) => p.file !== file));
        this.pictureError.set(e.type === 'photo-type' ? PHOTO_ERRORS.type : PHOTO_ERRORS.size);
        return null;
      }
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.mark(file, 'failed');
      return null;
    }
  }

  private mark(file: File, state: DialogPicture['state']) {
    this.pictures.update((list) => list.map((p) => (p.file === file ? { ...p, state } : p)));
  }

  private stored(reward: GalleryReward, done?: File) {
    this.current.set(reward);
    const waiting = this.pictures().filter((p) => !p.id && p.file !== done);
    this.pictures.set([...pictureOf(reward), ...waiting]);
    this.changed.emit(reward);
  }

  /** Removes or features a stored picture; a failure leaves the list as it was. */
  private async change(request: () => Promise<GalleryReward>) {
    try {
      this.stored(await request());
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.toasts.show({ severity: 'danger', title: 'The picture wasn’t changed' });
    }
  }

  /**
   * Adds the reward, then sends the pictures chosen for it in order and features the chosen one, as
   * Add a book sends its picture after the book. If a picture fails the reward stays added and the
   * dialog goes on as its edit dialog, with Try again on that picture.
   */
  private async addWithPictures(input: GalleryRewardInput) {
    const chosen = this.pictures();
    const added = await this.api.add(input);
    this.current.set(added);
    let featured: string | null = null;
    for (const picture of chosen) {
      const id = await this.upload(picture.file!);
      if (picture.featured) featured = id;
    }
    const reward = this.current()!;
    if (featured && reward.featuredPicture !== reward.pictures.find((p) => p.id === featured)?.url) {
      await this.change(() => this.api.featurePicture(reward.id, featured));
    }
    if (this.pictures().some((p) => !p.id)) this.changed.emit(this.current()!);
    else this.saved.emit(this.current()!);
  }

  protected async save() {
    if (this.busy()) return;
    this.failed.set(false);
    const name = this.name().trim();
    const description = this.description().trim();
    const target = Number(this.target());
    this.nameError.set(
      !name ? 'Name the reward.' : name.length > 100 ? 'Use 100 characters or fewer.' : null,
    );
    this.targetError.set(
      /^\d+$/.test(this.target().trim()) && target >= 1 && target <= 20
        ? null
        : 'Use a whole number from 1 to 20.',
    );
    this.descriptionError.set(description.length > 500 ? 'Use 500 characters or fewer.' : null);
    if (this.problems().length) return;

    this.busy.set(true);
    try {
      const reward = this.current();
      if (reward) this.saved.emit(await this.api.update(reward.id, { name, description, target }));
      else await this.addWithPictures({ name, description, target });
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
