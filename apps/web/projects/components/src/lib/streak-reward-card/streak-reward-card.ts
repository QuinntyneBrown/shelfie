import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Progress } from '../progress/progress';
import { StreakRewardBadge } from '../streak-reward-badge/streak-reward-badge';

/**
 * A streak reward on the shelf: its name and note with its badge at the end. Given `progress` it is the goal,
 * or ready once the progress reaches the milestone; the 7-day goal shows a path of days, longer ones a bar.
 */
@Component({
  selector: 'sh-streak-reward-card',
  imports: [Progress, StreakRewardBadge],
  templateUrl: './streak-reward-card.html',
  styleUrl: './streak-reward-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreakRewardCard {
  readonly title = input.required<string>();
  readonly note = input.required<string>();
  readonly milestone = input.required<number>();
  readonly amount = input<number | null>(null);
  /** Days in a row toward it when it is the goal or ready; null otherwise. */
  readonly progress = input<number | null>(null);
  readonly given = input(false);
  protected readonly reached = computed(() => (this.progress() ?? 0) >= this.milestone());
  protected readonly days = computed(() => Array.from({ length: this.milestone() }, (_, i) => i + 1));
  protected readonly label = computed(() => `${this.progress()} of ${this.milestone()} days in a row`);
}
