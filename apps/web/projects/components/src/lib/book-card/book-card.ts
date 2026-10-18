import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cover } from '../cover/cover';
import { Progress } from '../progress/progress';

@Component({
  selector: 'sh-book-card',
  imports: [Cover, Progress, RouterLink],
  templateUrl: './book-card.html',
  styleUrl: './book-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookCard {
  readonly title = input.required<string>();
  /** Where tapping the book goes. */
  readonly link = input.required<unknown[]>();
  readonly author = input<string | null>(null);
  readonly coverColor = input.required<string>();
  readonly sticker = input.required<string>();
  readonly coverImage = input<string | null>(null);
  /** Chapters logged; progress is hidden for a book not yet started. */
  readonly logged = input.required<number>();
  readonly chapters = input.required<number>();
}
