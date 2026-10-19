import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { EmptyState, Leaderboard, Skeleton } from 'components';
import { ApiError, ToastService } from 'core';
import { Challenge, Challenges, ReviewApi } from '../review-api';
import { GiveRewardDialog } from '../give-reward-dialog/give-reward-dialog';
import { StartChallengeDialog } from '../start-challenge-dialog/start-challenge-dialog';

/** Review's Challenges tab: the newest challenge with its leaderboard (review/run-challenges). */
@Component({
  selector: 'sh-challenges-tab',
  imports: [DatePipe, EmptyState, GiveRewardDialog, Leaderboard, Skeleton, StartChallengeDialog],
  templateUrl: './challenges-tab.html',
  styleUrl: './challenges-tab.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChallengesTab {
  private readonly api = inject(ReviewApi);
  protected readonly view = signal<Challenges | null>(null);
  protected readonly failed = signal(false);
  protected readonly starting = signal(false);
  protected readonly rewarding = signal<Challenge | null>(null);
  protected readonly ending = signal(false);
  private readonly toasts = inject(ToastService);

  constructor() {
    void this.load();
  }

  protected async load() {
    this.failed.set(false);
    try {
      this.view.set(await this.api.challenges());
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.failed.set(true);
    }
  }

  /** A challenge can start only when none is running (L2-138). */
  protected canStart(view: Challenges) {
    return !view.current || view.current.ended;
  }

  protected started() {
    this.starting.set(false);
    this.toasts.show({ title: 'Challenge started' });
    void this.load();
  }

  protected alreadyRunning() {
    this.starting.set(false);
    this.toasts.show({ severity: 'warning', title: 'A challenge is already running' });
    void this.load();
  }

  /** One short line per insight that has something to say (L2-141). */
  protected insightLines(challenge: Challenge) {
    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
    const { topReader, climber, streak } = challenge.insights ?? { topReader: null, climber: null, streak: null };
    return [
      topReader && `🏅 ${topReader.name} read the most this week: ${plural(topReader.count, 'chapter')}`,
      climber && `📈 ${climber.name} climbed the most: ${plural(climber.gain, 'more chapter')} than last week`,
      streak && `🔥 ${streak.name} has the longest streak: ${plural(streak.days, 'day')}`,
    ].filter((line): line is string => !!line);
  }

  protected async endNow(challenge: Challenge) {
    if (this.ending()) return;
    this.ending.set(true);
    try {
      this.replace(await this.api.endChallenge(challenge.id));
      this.toasts.show({ title: 'Challenge ended' });
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.toasts.show({ severity: 'danger', title: 'The challenge didn’t end', text: 'Check your connection and try again.' });
    } finally {
      this.ending.set(false);
    }
  }

  protected rewarded(challenge: Challenge) {
    this.rewarding.set(null);
    this.replace(challenge);
    this.toasts.show({ title: 'Reward given!' });
  }

  private replace(challenge: Challenge) {
    this.view.update((view) => view && { ...view, current: view.current?.id === challenge.id ? challenge : view.current });
  }

  /** The winners' names, "Nia" or "Nia and Theo". */
  protected winnerNames(challenge: Challenge) {
    return challenge.standings
      .filter((s) => challenge.winners.includes(s.readerId))
      .map((s) => s.name)
      .join(' and ');
  }

  /** "🏆 Nia won with 8 chapters!", or "No winner this time." (L2-142). */
  protected resultLine(challenge: Challenge) {
    const winner = challenge.standings.find((s) => challenge.winners.includes(s.readerId));
    if (!winner) return 'No winner this time.';
    const unit = challenge.measure === 'chapters' ? 'chapter' : 'book';
    return `🏆 ${this.winnerNames(challenge)} won with ${winner.count} ${unit}${winner.count === 1 ? '' : 's'}!`;
  }

  protected measureLabel(challenge: Challenge) {
    return challenge.measure === 'chapters' ? 'Chapters logged' : 'Books finished';
  }

  protected daysLeftLabel(challenge: Challenge) {
    if (challenge.daysLeft === 0) return 'last day';
    return `${challenge.daysLeft} ${challenge.daysLeft === 1 ? 'day' : 'days'} left`;
  }
}
