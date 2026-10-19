import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EmptyState, GoalCard, JoinCode, Skeleton } from 'components';
import { ApiError, ToastService } from 'core';
import { CommunitiesApi, CommunityView, Family, GoalView, goalLine } from '../communities-api';
import { LeaveCommunityDialog } from '../leave-community-dialog/leave-community-dialog';
import { ReadingGoalDialog } from '../reading-goal-dialog/reading-goal-dialog';
import { RemoveReadingGoalDialog } from '../remove-reading-goal-dialog/remove-reading-goal-dialog';

/** One community: its join code, its reading goal and its families, each only a name and a count (L2-149, L2-153). */
@Component({
  selector: 'sh-community-page',
  imports: [EmptyState, GoalCard, JoinCode, LeaveCommunityDialog, ReadingGoalDialog, RemoveReadingGoalDialog, RouterLink, Skeleton],
  templateUrl: './community-page.html',
  styleUrl: './community-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityPage {
  private readonly api = inject(CommunitiesApi);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  /** The route's `:id`. */
  readonly id = input.required<string>();

  protected readonly community = signal<CommunityView | null>(null);
  protected readonly state = signal<'loading' | 'loaded' | 'not-found' | 'failed'>('loading');
  protected readonly dialog = signal<'leave' | 'goal' | 'remove-goal' | null>(null);
  protected readonly goalLine = goalLine;

  constructor() {
    effect(() => {
      this.id();
      untracked(() => this.load());
    });
  }

  protected async load() {
    this.state.set('loading');
    try {
      this.community.set(await this.api.get(this.id()));
      this.state.set('loaded');
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) this.state.set('not-found');
      else if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      else this.state.set('failed');
    }
  }

  protected countOf(family: Family) {
    if (family.finished === null) return 'Member';
    return `${family.finished} ${family.finished === 1 ? 'book' : 'books'} toward the goal`;
  }

  protected goalNote(community: CommunityView, goal: GoalView) {
    const families = `${community.families.length} ${community.families.length === 1 ? 'family' : 'families'}`;
    return `${goalLine(goal)} · ${families}`;
  }

  protected async goalSaved() {
    this.dialog.set(null);
    this.toasts.show({ title: 'Reading goal saved' });
    this.community.set(await this.api.get(this.id()));
  }

  protected async goalRemoved() {
    this.dialog.set(null);
    this.community.set(await this.api.get(this.id()));
  }

  protected async left(community: CommunityView) {
    this.dialog.set(null);
    this.toasts.show({ title: `You left ${community.name}`, text: 'You can join again with the code.' });
    await this.router.navigateByUrl('/communities');
  }
}
