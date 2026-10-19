import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** A streak reward's badge: a shield with its milestone and a coin with its amount, or a 🎁 seal when it isn't money. */
@Component({
  selector: 'sh-streak-reward-badge',
  templateUrl: './streak-reward-badge.html',
  styleUrl: './streak-reward-badge.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreakRewardBadge {
  /** Days in a row: 7, 30 or 100. */
  readonly milestone = input.required<number>();
  /** Whole dollars, or null. */
  readonly amount = input<number | null>(null);
  /** Greyed while it is not yet in reach. */
  readonly locked = input(false);
  protected readonly label = computed(
    () => `${this.milestone()}-day badge` + (this.amount() ? `, $${this.amount()}` : ''),
  );
  protected readonly daysSize = computed(() => [54, 46, 36][String(this.milestone()).length - 1] ?? 36);
  protected readonly amountSize = computed(() => [17, 14, 11][String(this.amount()).length - 2] ?? 11);
}
