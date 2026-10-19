import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { Banner, Dialog, Segmented, Switch, TextField } from 'components';
import { ApiError } from 'core';
import { Challenge, ChallengeReader, ReviewApi } from '../review-api';

const MEASURES = [
  { value: 'chapters', label: 'Chapters logged' },
  { value: 'books', label: 'Books finished' },
];
const LENGTHS = [
  { value: 'week', label: 'One week' },
  { value: 'two-weeks', label: 'Two weeks' },
  { value: 'month', label: 'A month' },
];

/** Starts a household challenge today: name, what counts, goal, length and the readers taking part (L2-137). */
@Component({
  selector: 'sh-start-challenge-dialog',
  imports: [Banner, DatePipe, Dialog, Segmented, Switch, TextField],
  templateUrl: './start-challenge-dialog.html',
  styleUrl: './start-challenge-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartChallengeDialog {
  private readonly api = inject(ReviewApi);

  readonly open = input(false);
  readonly readers = input.required<ChallengeReader[]>();
  /** Today in the household's time zone, the day the challenge starts. */
  readonly today = input.required<string>();
  readonly started = output<Challenge>();
  /** Another parent started one first (409 `challenge-running`). */
  readonly alreadyRunning = output<void>();
  readonly closed = output<void>();

  protected readonly measures = MEASURES;
  protected readonly lengths = LENGTHS;
  protected readonly name = signal('');
  protected readonly measure = signal('chapters');
  protected readonly goal = signal('15');
  protected readonly length = signal('two-weeks');
  protected readonly taking = signal<Record<string, boolean>>({});
  protected readonly nameError = signal<string | null>(null);
  protected readonly goalError = signal<string | null>(null);
  protected readonly readersError = signal<string | null>(null);
  protected readonly problems = signal<string[]>([]);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.name.set('');
      this.measure.set('chapters');
      this.goal.set('15');
      this.length.set('two-weeks');
      this.taking.set(Object.fromEntries(this.readers().map((r) => [r.id, true])));
      this.nameError.set(null);
      this.goalError.set(null);
      this.readersError.set(null);
      this.problems.set([]);
      this.failed.set(false);
    });
  }

  protected take(readerId: string, on: boolean) {
    this.taking.update((taking) => ({ ...taking, [readerId]: on }));
  }

  protected async start() {
    if (this.busy()) return;
    this.failed.set(false);
    const name = this.name().trim();
    const goal = Number(this.goal());
    const readerIds = this.readers()
      .filter((r) => this.taking()[r.id])
      .map((r) => r.id);
    this.nameError.set(name ? null : 'Give the challenge a name.');
    this.goalError.set(Number.isInteger(goal) && goal >= 1 && goal <= 500 && this.goal().trim() !== '' ? null : 'Pick a goal from 1 to 500.');
    this.readersError.set(readerIds.length ? null : 'Pick at least one reader.');
    this.problems.set(
      [this.nameError() && 'Name the challenge', this.goalError() && 'Fix the goal', this.readersError() && 'Pick a reader'].filter(
        (p): p is string => !!p,
      ),
    );
    if (this.problems().length) return;

    this.busy.set(true);
    try {
      this.started.emit(await this.api.startChallenge({ name, measure: this.measure(), goal, length: this.length(), readerIds }));
    } catch (e) {
      if (e instanceof ApiError && e.type === 'challenge-running') this.alreadyRunning.emit();
      else if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      else this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
