import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'sh-streak-badge',
  templateUrl: './streak-badge.html',
  styleUrl: './streak-badge.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreakBadge {
  readonly days = input.required<number>();
}
