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
import { Banner, Dialog, PictureItem, PictureList, TextField, Textarea } from 'components';
import { ApiError } from 'core';
import { GalleryReward, GalleryRewardsApi } from '../gallery-rewards-api';

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
 * Editing, each picture change is stored at once and reported as `changed` (ADR-0010).
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
  protected readonly pictureHelp = computed(
    () => 'Up to 6. The featured one shows on ' + this.readerName() + '’s shelf. JPEG, PNG or WebP, up to 5 MB each.',
  );
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  protected readonly heading = computed(() => {
    const reward = this.editing();
    return reward ? `Edit ${reward.name}` : 'Add a reward';
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const reward = this.editing();
      this.name.set(reward?.name ?? '');
      this.description.set(reward?.description ?? '');
      this.pictures.set(reward ? pictureOf(reward) : []);
      this.target.set(reward ? String(reward.target) : '');
      this.nameError.set(null);
      this.descriptionError.set(null);
      this.targetError.set(null);
      this.failed.set(false);
    });
  }

  protected async addPicture(file: File) {
    const reward = this.editing();
    if (!reward) return;
    this.pictures.update((list) => [...list, { id: null, url: URL.createObjectURL(file), featured: false, file }]);
    const stored = await this.api.addPicture(reward.id, file);
    this.pictures.set(pictureOf(stored));
    this.changed.emit(stored);
  }

  protected async removePicture(index: number) {
    const reward = this.editing();
    const picture = this.pictures()[index];
    if (!reward || !picture?.id) return;
    const stored = await this.api.removePicture(reward.id, picture.id);
    this.pictures.set(pictureOf(stored));
    this.changed.emit(stored);
  }

  protected async featurePicture(index: number) {
    const reward = this.editing();
    const picture = this.pictures()[index];
    if (!reward || !picture?.id) return;
    const stored = await this.api.featurePicture(reward.id, picture.id);
    this.pictures.set(pictureOf(stored));
    this.changed.emit(stored);
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
      const reward = this.editing();
      this.saved.emit(
        reward
          ? await this.api.update(reward.id, { name, description, target })
          : await this.api.add({ name, description, target }),
      );
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
