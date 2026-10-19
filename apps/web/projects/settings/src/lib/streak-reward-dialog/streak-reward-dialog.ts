import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Banner, Dialog, TextField } from 'components';
import { ApiError } from 'core';
import { StreakReward, StreakRewardsApi } from '../streak-rewards-api';

/** Sets or renames the reward for one streak milestone; saves through the API and reports the saved reward. */
@Component({
  selector: 'sh-streak-reward-dialog',
  imports: [Banner, Dialog, TextField],
  templateUrl: './streak-reward-dialog.html',
  styleUrl: './streak-reward-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreakRewardDialog {
  private readonly api = inject(StreakRewardsApi);

  readonly open = input(false);
  /** The milestone in days: 7, 30 or 100. */
  readonly milestone = input.required<number>();
  /** The reward being edited, or null to set one. */
  readonly editing = input<StreakReward | null>(null);
  /** Who earns it, for the help text. */
  readonly readerName = input.required<string>();
  readonly saved = output<StreakReward>();
  readonly closed = output<void>();

  protected readonly name = signal('');
  protected readonly nameError = signal<string | null>(null);
  protected readonly amount = signal('');
  protected readonly amountError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  protected readonly heading = computed(() =>
    this.editing() ? `Edit the ${this.milestone()}-day reward` : `Set a ${this.milestone()}-day reward`,
  );

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.name.set(this.editing()?.name ?? '');
      this.nameError.set(null);
      this.amount.set(String(this.editing()?.amount ?? ''));
      this.amountError.set(null);
      this.failed.set(false);
    });
  }

  protected async save() {
    if (this.busy()) return;
    this.failed.set(false);
    const name = this.name().trim();
    const text = String(this.amount()).trim();
    const amount = text ? Number(text) : null;
    this.nameError.set(name ? null : 'Name the reward.');
    this.amountError.set(
      amount === null || (Number.isInteger(amount) && amount >= 1 && amount <= 1000)
        ? null
        : 'Enter whole dollars from 1 to 1000.',
    );
    if (this.nameError() || this.amountError()) return;

    this.busy.set(true);
    try {
      this.saved.emit(await this.api.set(this.milestone(), name, amount));
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
