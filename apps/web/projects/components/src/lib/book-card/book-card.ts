import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Cover } from '../cover/cover';
import { Progress } from '../progress/progress';

@Component({
  selector: 'sh-book-card',
  imports: [Cover, Progress],
  templateUrl: './book-card.html',
  styleUrl: './book-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookCard {
  readonly title = input.required<string>();
  readonly author = input<string | null>(null);
  readonly coverColor = input.required<string>();
  readonly sticker = input.required<string>();
  /** Chapters logged; progress is hidden for a book not yet started. */
  readonly logged = input.required<number>();
  readonly chapters = input.required<number>();
}
