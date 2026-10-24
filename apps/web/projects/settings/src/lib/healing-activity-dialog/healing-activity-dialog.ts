import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { Banner, Dialog, TextField } from 'components';
import { ApiError } from 'core';
import { StreakHealingApi } from '../streak-healing-api';

/** Sets or renames the streak healing activity; saves through the API and reports the saved name. */
@Component({
  selector: 'sh-healing-activity-dialog',
  imports: [Banner, Dialog, TextField],
  templateUrl: './healing-activity-dialog.html',
  styleUrl: './healing-activity-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HealingActivityDialog {
  private readonly api = inject(StreakHealingApi);

  readonly open = input(false);
  /** The activity being edited, or null to set one. */
  readonly editing = input<string | null>(null);
  /** Who it heals for, for the help text. */
  readonly readerName = input.required<string>();
  readonly saved = output<string>();
  readonly closed = output<void>();

  protected readonly name = signal('');
  protected readonly nameError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.name.set(this.editing() ?? '');
      this.nameError.set(null);
      this.failed.set(false);
    });
  }

  protected async save() {
    if (this.busy()) return;
    this.failed.set(false);
    const name = this.name().trim();
    this.nameError.set(name ? null : 'Name the activity.');
    if (this.nameError()) return;

    this.busy.set(true);
    try {
      this.saved.emit(await this.api.set(name));
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
