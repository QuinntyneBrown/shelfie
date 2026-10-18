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

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

/** What the picker says about a file it cannot use; the server's refusals read the same. */
export const COVER_PICTURE_ERRORS = {
  type: 'Shelfie can’t use that file. Pick a JPEG, PNG or WebP picture.',
  size: 'That picture is too big. Pick one under 5 MB.',
};

let nextId = 0;

/**
 * Adds, changes or removes a book's cover picture; the page's own cover is the preview. A file that
 * is not a JPEG, PNG or WebP, or is over 5 MB, is refused here with an error; any other file is
 * emitted for the owner to keep or upload.
 */
@Component({
  selector: 'sh-cover-picker',
  templateUrl: './cover-picker.html',
  styleUrl: './cover-picker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoverPicker {
  readonly label = input.required<string>();
  readonly hasPicture = input(false);
  readonly busy = input(false);
  /** An error from the owner, such as the server refusing the file. */
  readonly error = input<string | null>(null);
  readonly picked = output<File>();
  readonly removed = output<void>();

  protected readonly labelId = `sh-cover-picker-${nextId++}-label`;
  protected readonly helpId = this.labelId.replace('label', 'help');
  protected readonly errorId = this.labelId.replace('label', 'error');
  private readonly refused = signal<string | null>(null);
  protected readonly shownError = computed(() => this.refused() ?? this.error());
  private readonly file = viewChild.required<ElementRef<HTMLInputElement>>('file');
  /** Set by Remove picture, which disappears: focus goes back to the chooser once it is enabled again. */
  private refocus = false;

  constructor() {
    afterRenderEffect(() => {
      if (this.busy() || !this.refocus) return;
      this.refocus = false;
      this.file().nativeElement.focus();
    });
  }

  protected remove() {
    this.refocus = true;
    this.removed.emit();
  }

  protected choose(event: Event) {
    const field = event.target as HTMLInputElement;
    const file = field.files?.[0];
    // Cleared so that choosing the same file again is still a change.
    field.value = '';
    if (!file) return;
    if (!TYPES.includes(file.type)) this.refused.set(COVER_PICTURE_ERRORS.type);
    else if (file.size > MAX_BYTES) this.refused.set(COVER_PICTURE_ERRORS.size);
    else {
      this.refused.set(null);
      this.picked.emit(file);
    }
  }
}
