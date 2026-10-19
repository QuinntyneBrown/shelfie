import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One reading feat: earned on a day, or still to earn with a hint of how. Place it inside a `li` of `ul.achievements`. */
@Component({
  selector: 'sh-achievement-badge',
  imports: [DatePipe],
  templateUrl: './achievement-badge.html',
  styleUrl: './achievement-badge.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AchievementBadge {
  readonly icon = input.required<string>();
  readonly name = input.required<string>();
  /** What to do to earn it. */
  readonly hint = input.required<string>();
  /** The day it was earned (YYYY-MM-DD); null while it is locked. */
  readonly earnedOn = input<string | null>(null);
  /** Replaces the earned or not-yet line; null leaves the line out. Anything projected goes under it. */
  readonly note = input<string | null | undefined>(undefined);
}
