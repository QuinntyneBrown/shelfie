import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Banner, Dialog, TextField } from 'components';
import { ApiError } from 'core';
import { CommunitiesApi, CommunityView } from '../communities-api';

const MAX_NAME = 40;

/** Starts a community: its name and the name this family shows in it (L2-145, L2-146). */
@Component({
  selector: 'sh-start-community-dialog',
  imports: [Banner, Dialog, TextField],
  templateUrl: './start-community-dialog.html',
  styleUrl: './start-community-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartCommunityDialog {
  private readonly api = inject(CommunitiesApi);

  readonly open = input(false);
  readonly started = output<CommunityView>();
  readonly closed = output<void>();

  protected readonly name = signal('');
  protected readonly familyName = signal('');
  protected readonly nameError = signal<string | null>(null);
  protected readonly familyError = signal<string | null>(null);
  protected readonly problems = computed(() => [
    ...(this.nameError() ? ['The community needs a name'] : []),
    ...(this.familyError() ? ['Your family needs a name'] : []),
  ]);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  protected readonly maxName = MAX_NAME;

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.name.set('');
      this.familyName.set('');
      this.nameError.set(null);
      this.familyError.set(null);
      this.failed.set(false);
    });
  }

  protected async start() {
    if (this.busy()) return;
    this.failed.set(false);
    const name = this.name().trim();
    const familyName = this.familyName().trim();
    this.nameError.set(name && name.length <= MAX_NAME ? null : 'Give your community a name.');
    this.familyError.set(familyName && familyName.length <= MAX_NAME ? null : 'Give your family a name, like “The Bells”.');
    if (this.problems().length) return;

    this.busy.set(true);
    try {
      this.started.emit(await this.api.start(name, familyName));
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
