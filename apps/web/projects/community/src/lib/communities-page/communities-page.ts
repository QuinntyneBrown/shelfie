import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EmptyState, GoalCard, Skeleton } from 'components';
import { ToastService } from 'core';
import { CommunitiesApi, CommunitySummary, CommunityView, GoalView, goalLine } from '../communities-api';
import { JoinCommunityDialog } from '../join-community-dialog/join-community-dialog';
import { ReadingGoalDialog } from '../reading-goal-dialog/reading-goal-dialog';
import { RemoveReadingGoalDialog } from '../remove-reading-goal-dialog/remove-reading-goal-dialog';
import { StartCommunityDialog } from '../start-community-dialog/start-community-dialog';

/** The parent's Community tab: the household's reading goal and the communities it belongs to (L2-149, L2-154). */
@Component({
  selector: 'sh-communities-page',
  imports: [
    EmptyState,
    GoalCard,
    JoinCommunityDialog,
    ReadingGoalDialog,
    RemoveReadingGoalDialog,
    RouterLink,
    Skeleton,
    StartCommunityDialog,
  ],
  templateUrl: './communities-page.html',
  styleUrl: './communities-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunitiesPage {
  private readonly api = inject(CommunitiesApi);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  protected readonly communities = signal<CommunitySummary[] | null>(null);
  protected readonly goal = signal<GoalView | null>(null);
  protected readonly failed = signal(false);
  protected readonly dialog = signal<'start' | 'join' | 'goal' | 'remove-goal' | null>(null);
  protected readonly goalLine = goalLine;

  constructor() {
    this.load();
  }

  protected async load() {
    this.failed.set(false);
    try {
      const [communities, goals] = await Promise.all([this.api.list(), this.api.goals()]);
      this.goal.set(goals.household);
      this.communities.set(communities);
    } catch {
      this.failed.set(true);
    }
  }

  protected familiesOf(community: CommunitySummary) {
    return `${community.families} ${community.families === 1 ? 'family' : 'families'}`;
  }

  protected goalSummaryOf(community: CommunitySummary) {
    return community.goal ? `${community.goal.finished} of ${goalLine(community.goal)}` : 'No reading goal yet';
  }

  protected async opened(community: CommunityView, toast: string | null) {
    this.dialog.set(null);
    if (toast) this.toasts.show({ title: toast, text: 'Your books now count toward its reading goal.' });
    await this.router.navigate(['/communities', community.id]);
  }

  protected goalSaved(goal: GoalView) {
    this.dialog.set(null);
    this.goal.set(goal);
    this.toasts.show({ title: 'Reading goal saved', text: `${goalLine(goal)}.` });
  }

  protected goalRemoved() {
    this.dialog.set(null);
    this.goal.set(null);
  }
}
