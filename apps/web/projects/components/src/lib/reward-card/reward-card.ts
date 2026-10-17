import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Cover } from '../cover/cover';

@Component({
  selector: 'sh-reward-card',
  imports: [Cover],
  templateUrl: './reward-card.html',
  styleUrl: './reward-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RewardCard {
  readonly title = input.required<string>();
  readonly coverColor = input.required<string>();
  readonly sticker = input.required<string>();
}
