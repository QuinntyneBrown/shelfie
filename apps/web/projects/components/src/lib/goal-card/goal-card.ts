import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Progress } from '../progress/progress';

export type GoalState = 'in-progress' | 'reached' | 'ended';

/**
 * A reading goal (ADR-0021): an icon, the title with a Reached or Ended badge, a note, and how many of the target
 * books are finished. Without a `target` it has no bar, for "No reading goal yet". Projected content is the actions.
 * Never used for the reward gallery's goal, which is a reward card.
 */
@Component({
  selector: 'sh-goal-card',
  imports: [Progress],
  templateUrl: './goal-card.html',
  styleUrl: './goal-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalCard {
  readonly title = input.required<string>();
  readonly note = input.required<string>();
  readonly finished = input(0);
  readonly target = input<number | null>(null);
  readonly state = input<GoalState>('in-progress');
  /** 🎯 for a household, 🤝 for a community; reached and ended show their own. */
  readonly icon = input('🎯');

  protected readonly shownIcon = computed(() => ({ reached: '🏆', ended: '⏳' })[this.state() as 'reached' | 'ended'] ?? this.icon());
}
