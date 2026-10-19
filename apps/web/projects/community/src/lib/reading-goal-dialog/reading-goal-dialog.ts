import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Banner, Dialog, TextField } from 'components';
import { ApiError } from 'core';
import { CommunitiesApi, GoalView } from '../communities-api';

/**
 * Sets or edits a reading goal: how many books by when (L2-154, L2-159). With a `communityId` it is that community's
 * goal (1 to 1,000 books); otherwise the household's (1 to 100). An edit keeps the goal's first day.
 */
@Component({
  selector: 'sh-reading-goal-dialog',
  imports: [Banner, Dialog, TextField],
  templateUrl: './reading-goal-dialog.html',
  styleUrl: './reading-goal-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadingGoalDialog {
  private readonly api = inject(CommunitiesApi);

  readonly open = input(false);
  readonly goal = input<GoalView | null>(null);
  readonly communityId = input<string | null>(null);
  readonly saved = output<GoalView>();
  readonly closed = output<void>();

  protected readonly max = computed(() => (this.communityId() ? 1000 : 100));
  protected readonly heading = computed(() =>
    this.communityId()
      ? this.goal()
        ? 'Edit the community’s reading goal'
        : 'Set the community’s reading goal'
      : this.goal()
        ? 'Edit our reading goal'
        : 'Set our reading goal',
  );
  protected readonly target = signal('');
  protected readonly endsOn = signal('');
  protected readonly targetError = signal<string | null>(null);
  protected readonly endsOnError = signal<string | null>(null);
  protected readonly problems = computed(() => [
    ...(this.targetError() ? ['How many books'] : []),
    ...(this.endsOnError() ? ['An end date from today on'] : []),
  ]);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const goal = this.goal();
      this.target.set(goal ? String(goal.target) : '');
      this.endsOn.set(goal?.endsOn ?? '');
      this.targetError.set(null);
      this.endsOnError.set(null);
      this.failed.set(false);
    });
  }

  protected async save() {
    if (this.busy()) return;
    this.failed.set(false);
    const target = Number(this.target());
    const valid = this.target().trim() !== '' && Number.isInteger(target) && target >= 1 && target <= this.max();
    this.targetError.set(valid ? null : `Choose 1 to ${this.max().toLocaleString('en')} books.`);
    this.endsOnError.set(/^\d{4}-\d{2}-\d{2}$/.test(this.endsOn()) ? null : 'Pick the day to finish by.');
    if (this.problems().length) return;

    this.busy.set(true);
    try {
      const input = { target, endsOn: this.endsOn() };
      const id = this.communityId();
      this.saved.emit(id ? (await this.api.setCommunityGoal(id, input)).goal! : await this.api.setHouseholdGoal(input));
    } catch (e) {
      if (e instanceof ApiError && e.type === 'validation') {
        this.endsOnError.set('Pick today or a later day, within a year.');
      } else if (e instanceof ApiError && e.status > 0 && e.status < 500) {
        throw e;
      } else {
        this.failed.set(true);
      }
    } finally {
      this.busy.set(false);
    }
  }
}
