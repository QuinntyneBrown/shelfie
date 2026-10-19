import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One line of recent activity: an emoji, what happened, and when, with an optional action projected after it. */
@Component({
  selector: 'sh-activity-item',
  templateUrl: './activity-item.html',
  styleUrl: './activity-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityItem {
  readonly emoji = input.required<string>();
  readonly text = input.required<string>();
  readonly when = input.required<string>();
}
