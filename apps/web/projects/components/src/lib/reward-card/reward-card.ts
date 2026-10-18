import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cover } from '../cover/cover';
import { Progress } from '../progress/progress';
import { Sticker } from '../sticker/sticker';

/**
 * A finished book on the trophy shelf with its reward; or, given a `target`, a reward from the gallery
 * with what it takes, its progress when it is the goal, and its action as projected content.
 */
@Component({
  selector: 'sh-reward-card',
  imports: [Cover, Progress, RouterLink, Sticker],
  templateUrl: './reward-card.html',
  styleUrl: './reward-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RewardCard {
  readonly title = input.required<string>();
  /** Where tapping the book goes. */
  readonly link = input<unknown[] | null>(null);
  readonly coverColor = input<string | null>(null);
  readonly sticker = input<string | null>(null);
  readonly coverImage = input<string | null>(null);
  /** Second line, e.g. the reward and its date. */
  readonly note = input.required<string>();
  /** Finished books a gallery reward takes; set, the card is a gallery reward. */
  readonly target = input<number | null>(null);
  /** A gallery reward's featured picture, shown over its 🎁. */
  readonly picture = input<string | null>(null);
  /** A gallery reward's description; nothing shows when it is empty. */
  readonly description = input<string | null>(null);
  /** Books finished toward it, when it is the goal. */
  readonly progress = input<number | null>(null);
  protected readonly reached = computed(
    () => (this.progress() ?? 0) >= (this.target() ?? Infinity),
  );
}
