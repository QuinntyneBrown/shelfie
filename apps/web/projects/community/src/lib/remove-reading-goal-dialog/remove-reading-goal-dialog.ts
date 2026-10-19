import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { Banner, Dialog } from 'components';
import { ApiError } from 'core';
import { CommunitiesApi, GoalView } from '../communities-api';

/** Confirms removing the household's or a community's reading goal; the books stay finished (L2-156, L2-159). */
@Component({
  selector: 'sh-remove-reading-goal-dialog',
  imports: [Banner, Dialog],
  templateUrl: './remove-reading-goal-dialog.html',
  styleUrl: './remove-reading-goal-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RemoveReadingGoalDialog {
  private readonly api = inject(CommunitiesApi);

  readonly open = input(false);
  readonly goal = input<GoalView | null>(null);
  readonly communityId = input<string | null>(null);
  readonly removed = output<void>();
  readonly closed = output<void>();

  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    effect(() => {
      if (this.open()) this.failed.set(false);
    });
  }

  protected async remove() {
    if (this.busy()) return;
    this.failed.set(false);
    this.busy.set(true);
    try {
      const id = this.communityId();
      await (id ? this.api.removeCommunityGoal(id) : this.api.removeHouseholdGoal());
      this.removed.emit();
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
