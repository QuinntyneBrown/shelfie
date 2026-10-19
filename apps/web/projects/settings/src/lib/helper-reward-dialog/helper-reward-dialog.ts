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
import { HelperReward, HelperRewardApi } from '../helper-reward-api';

/** Sets or edits the household's helper reward; saves through the API and reports the saved reward (L2-141). */
@Component({
  selector: 'sh-helper-reward-dialog',
  imports: [Banner, Dialog, TextField],
  templateUrl: './helper-reward-dialog.html',
  styleUrl: './helper-reward-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelperRewardDialog {
  private readonly api = inject(HelperRewardApi);

  readonly open = input(false);
  /** The reward being edited, or null to set one. */
  readonly editing = input<HelperReward | null>(null);
  /** Who can earn it, for the help text. */
  readonly readerNames = input.required<string>();
  readonly saved = output<HelperReward>();
  readonly closed = output<void>();

  protected readonly name = signal('');
  protected readonly nameError = signal<string | null>(null);
  protected readonly minutes = signal('');
  protected readonly minutesError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  protected readonly heading = computed(() => (this.editing() ? 'Edit the helper reward' : 'Set the helper reward'));

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.name.set(this.editing()?.name ?? '');
      this.minutes.set(String(this.editing()?.targetMinutes ?? ''));
      this.nameError.set(null);
      this.minutesError.set(null);
      this.failed.set(false);
    });
  }

  protected async save() {
    if (this.busy()) return;
    this.failed.set(false);
    const name = this.name().trim();
    const minutes = Number(String(this.minutes()).trim() || NaN);
    this.nameError.set(name ? null : 'Name the reward.');
    this.minutesError.set(Number.isInteger(minutes) && minutes >= 30 && minutes <= 600 ? null : 'Use 30 to 600 minutes.');
    if (this.nameError() || this.minutesError()) return;

    this.busy.set(true);
    try {
      this.saved.emit(await this.api.set(name, minutes));
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
