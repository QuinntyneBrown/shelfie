import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { Progress } from '../progress/progress';

/** One reader's place in a challenge, already ranked by the API. */
export interface LeaderboardRow {
  readerId: string;
  name: string;
  color: string;
  photo: string | null;
  count: number;
  rank: number;
  leading: boolean;
}

const ORDINAL: Record<string, string> = { one: 'st', two: 'nd', few: 'rd', other: 'th' };
const ordinals = new Intl.PluralRules('en', { type: 'ordinal' });

/** A challenge's readers, ranked, each with progress to the goal; leaders wear a crown, and the `you` row is tinted. */
@Component({
  selector: 'sh-leaderboard',
  imports: [Avatar, Progress],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Leaderboard {
  readonly rows = input.required<LeaderboardRow[]>();
  readonly goal = input.required<number>();
  /** What is counted, for the progress bars' names: "chapters" or "books". */
  readonly unit = input.required<string>();
  /** The reader looking at the board, whose row is tinted and marked "(you)". */
  readonly you = input<string | null>(null);

  protected rankLabel(row: LeaderboardRow) {
    return `${row.rank}${ORDINAL[ordinals.select(row.rank)]}${row.leading ? ', in the lead' : ''}`;
  }
}
