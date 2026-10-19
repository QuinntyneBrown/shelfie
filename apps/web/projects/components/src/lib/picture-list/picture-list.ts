import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { PHOTO_ERRORS } from '../photo-picker/photo-picker';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

/** One thumbnail of the list. */
export interface PictureItem {
  url: string;
  featured: boolean;
  /** An upload in flight, or one that did not reach the server. */
  state?: 'uploading' | 'failed';
}

let nextId = 0;

/**
 * Several pictures of one thing as square thumbnails, the featured one marked, each with Make
 * featured, Remove and, when its upload failed, Try again; then Add a picture. It uploads nothing
 * itself: a chosen file that is a JPEG, PNG or WebP of up to 5 MB is emitted for the owner, any
 * other is refused here with the photo picker's words.
 */
@Component({
  selector: 'sh-picture-list',
  templateUrl: './picture-list.html',
  styleUrl: './picture-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PictureList {
  readonly label = input('Pictures');
  readonly pictures = input<PictureItem[]>([]);
  readonly help = input.required<string>();
  /** The most pictures allowed; Add a picture is disabled at it. */
  readonly max = input(6);
  /** Every button off, such as while the owner saves. */
  readonly disabled = input(false);
  /** An error from the owner, such as the server refusing the file. */
  readonly error = input<string | null>(null);
  readonly picked = output<File>();
  /** The index of the picture to remove. */
  readonly removed = output<number>();
  /** The index of the picture to make the featured one. */
  readonly featured = output<number>();
  /** The index of the failed picture to send again. */
  readonly retried = output<number>();

  protected readonly labelId = `sh-picture-list-${nextId++}-label`;
  protected readonly helpId = this.labelId.replace('label', 'help');
  protected readonly errorId = this.labelId.replace('label', 'error');
  protected readonly full = computed(() => this.pictures().length >= this.max());
  protected readonly uploading = computed(() =>
    this.pictures().some((p) => p.state === 'uploading'),
  );
  protected readonly shownHelp = computed(() =>
    this.uploading()
      ? 'Uploading the picture…'
      : this.full()
        ? `That’s ${this.max()} pictures, the most a reward can have. Remove one to add another.`
        : this.help(),
  );
  private readonly refused = signal<string | null>(null);
  protected readonly shownError = computed(() => this.refused() ?? this.error());
  private readonly file = viewChild.required<ElementRef<HTMLInputElement>>('file');
  /** Set by Remove, whose button disappears: focus goes to Add a picture once the list has changed. */
  private refocus = false;

  constructor() {
    afterRenderEffect(() => {
      // Runs again whenever the list changes.
      this.pictures();
      if (!this.refocus || this.file().nativeElement.disabled) return;
      this.refocus = false;
      this.file().nativeElement.focus();
    });
  }

  protected remove(index: number) {
    this.refocus = true;
    this.removed.emit(index);
  }

  protected choose(event: Event) {
    const field = event.target as HTMLInputElement;
    const file = field.files?.[0];
    // Cleared so that choosing the same file again is still a change.
    field.value = '';
    if (!file) return;
    if (!TYPES.includes(file.type)) this.refused.set(PHOTO_ERRORS.type);
    else if (file.size > MAX_BYTES) this.refused.set(PHOTO_ERRORS.size);
    else {
      this.refused.set(null);
      this.picked.emit(file);
    }
  }
}
