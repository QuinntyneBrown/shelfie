import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Avatar } from '../avatar/avatar';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

/** What the picker says about a file it cannot use; the server's refusals read the same. */
export const PHOTO_ERRORS = {
  type: 'Shelfie can’t use that file. Pick a JPEG, PNG or WebP photo.',
  size: 'That photo is too big. Pick one under 5 MB.',
};

let nextId = 0;

/**
 * Chooses, replaces or removes a person's own photo. A file that is not a JPEG, PNG or WebP, or is
 * over 5 MB, is refused here with an error; any other file is emitted for the owner to upload.
 */
@Component({
  selector: 'sh-photo-picker',
  imports: [Avatar],
  templateUrl: './photo-picker.html',
  styleUrl: './photo-picker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoPicker {
  readonly name = input.required<string>();
  readonly color = input.required<string>();
  readonly photo = input<string | null>(null);
  readonly busy = input(false);
  /** An error from the owner, such as the server refusing the file. */
  readonly error = input<string | null>(null);
  readonly picked = output<File>();
  readonly removed = output<void>();

  protected readonly helpId = `sh-photo-picker-${nextId++}-help`;
  protected readonly errorId = this.helpId.replace('help', 'error');
  private readonly refused = signal<string | null>(null);
  protected readonly shownError = computed(() => this.refused() ?? this.error());

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
