import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';

/** One thumbnail of the list. */
export interface PictureItem {
  url: string;
  featured: boolean;
}

let nextId = 0;

/**
 * Several pictures of one thing as square thumbnails, the featured one marked, and Add a picture.
 * It uploads nothing itself: chosen files are emitted for the owner.
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
  readonly picked = output<File>();
  /** The index of the picture to remove. */
  readonly removed = output<number>();
  /** The index of the picture to make the featured one. */
  readonly featured = output<number>();

  protected readonly labelId = `sh-picture-list-${nextId++}-label`;
  protected readonly helpId = this.labelId.replace('label', 'help');
  protected readonly full = computed(() => this.pictures().length >= this.max());
  protected readonly shownHelp = computed(() =>
    this.full()
      ? `That’s ${this.max()} pictures, the most a reward can have. Remove one to add another.`
      : this.help(),
  );
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
    if (file) this.picked.emit(file);
  }
}
