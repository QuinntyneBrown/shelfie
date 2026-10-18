import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

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
  readonly picked = output<File>();

  protected readonly labelId = `sh-picture-list-${nextId++}-label`;
  protected readonly helpId = this.labelId.replace('label', 'help');

  protected choose(event: Event) {
    const field = event.target as HTMLInputElement;
    const file = field.files?.[0];
    // Cleared so that choosing the same file again is still a change.
    field.value = '';
    if (file) this.picked.emit(file);
  }
}
