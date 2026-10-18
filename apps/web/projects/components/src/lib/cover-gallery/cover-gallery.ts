import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { Cover } from '../cover/cover';
import { Skeleton } from '../skeleton/skeleton';

let nextGroup = 0;

/** A grid of covers to choose one from: each option is a picture URL, shown on a plain cover until it loads. */
@Component({
  selector: 'sh-cover-gallery',
  imports: [Cover, Skeleton],
  templateUrl: './cover-gallery.html',
  styleUrl: './cover-gallery.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoverGallery {
  readonly label = input.required<string>();
  /** The picture URL of each cover. */
  readonly options = input<string[]>([]);
  readonly loading = input(false);
  /** The chosen picture URL. */
  readonly value = model<string | null>(null);
  protected readonly placeholders = [1, 2, 3, 4, 5, 6];
  protected readonly group = `sh-cover-gallery-${nextGroup++}`;
}
