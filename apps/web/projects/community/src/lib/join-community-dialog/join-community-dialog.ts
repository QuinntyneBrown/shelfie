import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Banner, Dialog, TextField } from 'components';
import { ApiError } from 'core';
import { CommunitiesApi, CommunityView } from '../communities-api';

const MAX_NAME = 40;

/** Joins a community with the code another parent gave; capitals, spaces and dashes don't matter (L2-148, L2-150). */
@Component({
  selector: 'sh-join-community-dialog',
  imports: [Banner, Dialog, TextField],
  templateUrl: './join-community-dialog.html',
  styleUrl: './join-community-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinCommunityDialog {
  private readonly api = inject(CommunitiesApi);

  readonly open = input(false);
  readonly joined = output<CommunityView>();
  /** The community this family is already in, which the parent chose to open. */
  readonly opened = output<CommunityView>();
  readonly closed = output<void>();

  protected readonly code = signal('');
  protected readonly familyName = signal('');
  protected readonly codeError = signal<string | null>(null);
  protected readonly familyError = signal<string | null>(null);
  /** The community the code belongs to when this family is already in it. */
  protected readonly already = signal<CommunityView | null>(null);
  protected readonly problems = computed(() => [
    ...(this.codeError() && !this.already() ? ['That code didn’t match a community'] : []),
    ...(this.familyError() ? ['Your family needs a name'] : []),
  ]);
  protected readonly busy = signal(false);
  protected readonly failed = signal<'network' | 'too-many' | null>(null);
  protected readonly maxName = MAX_NAME;

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.code.set('');
      this.familyName.set('');
      this.codeError.set(null);
      this.familyError.set(null);
      this.already.set(null);
      this.failed.set(null);
    });
  }

  protected async join() {
    if (this.busy()) return;
    this.failed.set(null);
    this.already.set(null);
    const code = this.code().trim();
    const familyName = this.familyName().trim();
    this.codeError.set(code ? null : 'Type the code another parent gave you.');
    this.familyError.set(familyName && familyName.length <= MAX_NAME ? null : 'Give your family a name, like “The Bells”.');
    if (this.codeError() || this.familyError()) return;

    this.busy.set(true);
    try {
      this.joined.emit(await this.api.join(code, familyName));
    } catch (e) {
      if (e instanceof ApiError && e.type === 'code-not-found') {
        this.codeError.set('No community has that code. Check it with the parent who gave it to you.');
      } else if (e instanceof ApiError && e.type === 'already-member') {
        const match = await this.findMine(code, (await this.api.list()).map((c) => c.id));
        this.already.set(match);
        this.codeError.set(match ? `Your family is already in ${match.name}.` : 'Your family is already in that community.');
      } else if (e instanceof ApiError && e.status === 429) {
        this.failed.set('too-many');
      } else if (e instanceof ApiError && e.status > 0 && e.status < 500) {
        throw e;
      } else {
        this.failed.set('network');
      }
    } finally {
      this.busy.set(false);
    }
  }

  /** Which of this family's communities the typed code belongs to. */
  private async findMine(code: string, ids: string[]) {
    const typed = code.toUpperCase().replace(/[\s-]/g, '');
    for (const id of ids) {
      const community = await this.api.get(id);
      if (community.joinCode === typed) return community;
    }
    return null;
  }
}
