import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { Banner, Dialog } from 'components';
import { ApiError } from 'core';
import { CommunitiesApi, CommunityView } from '../communities-api';

/** Confirms leaving a community; focus starts on Stay (L2-151). */
@Component({
  selector: 'sh-leave-community-dialog',
  imports: [Banner, Dialog],
  templateUrl: './leave-community-dialog.html',
  styleUrl: './leave-community-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveCommunityDialog {
  private readonly api = inject(CommunitiesApi);

  readonly community = input<CommunityView | null>(null);
  readonly left = output<CommunityView>();
  readonly closed = output<void>();

  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    effect(() => {
      if (this.community()) this.failed.set(false);
    });
  }

  protected async leave() {
    const community = this.community();
    if (!community || this.busy()) return;
    this.failed.set(false);
    this.busy.set(true);
    try {
      await this.api.leave(community.id);
      this.left.emit(community);
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
