import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cover } from '../cover/cover';

@Component({
  selector: 'sh-reward-card',
  imports: [Cover, RouterLink],
  templateUrl: './reward-card.html',
  styleUrl: './reward-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RewardCard {
  readonly title = input.required<string>();
  /** Where tapping the book goes. */
  readonly link = input.required<unknown[]>();
  readonly coverColor = input.required<string>();
  readonly sticker = input.required<string>();
  /** Second line, e.g. the reward and its date. */
  readonly note = input.required<string>();
}
