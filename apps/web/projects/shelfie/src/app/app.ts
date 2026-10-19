import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Banner, MenuItem, NavLink, TabBar } from 'components';
import { ReviewApi } from 'review';
import { ProfilePhotoDialog, SendFeedbackDialog } from 'settings';
import { filter, skip } from 'rxjs';
import { Toast, TopBar } from 'components';
import { BannerService, SessionService, ShellStatusService, ToastService } from 'core';

const MAX_VISIBLE_TOASTS = 3;

@Component({
  imports: [Banner, ProfilePhotoDialog, RouterOutlet, SendFeedbackDialog, TabBar, Toast, TopBar],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);
  protected readonly session = this.sessionService.current;
  /** The set-up wizard is a full-screen page: no top bar, no tab bar (L2-138). */
  protected readonly inWizard = signal(false);
  protected readonly navLinks = computed<NavLink[]>(() =>
    this.session()?.role === 'parent' && !this.inWizard()
      ? [
          {
            label: 'Review',
            route: '/review',
            icon: 'review',
            badge: this.queueBadge(),
          },
          { label: 'Books', route: '/books', icon: 'books' },
          { label: 'Settings', route: '/settings', icon: 'settings' },
        ]
      : [],
  );
  private readonly queueBadge = computed(() => {
    const count = this.status.queueCount() ?? 0;
    return { count, label: `${count} ${count === 1 ? 'chapter' : 'chapters'} to review` };
  });
  protected readonly menuItems = computed<MenuItem[]>(() => [
    this.session()?.role === 'parent'
      ? { id: 'settings', label: 'Settings' }
      : { id: 'photo', label: 'My photo' },
    { id: 'feedback', label: 'Send feedback' },
    { id: 'sign-out', label: 'Sign out' },
  ]);
  protected readonly menuHeader = computed(() => {
    const s = this.session();
    if (!s) return '';
    if (s.role === 'parent') return `${s.name} · @${s.username} · parent`;
    const streak = this.status.streak();
    return `${s.name} · @${s.username}` + (streak ? ` · 🔥 ${streak}-day streak` : '');
  });
  protected readonly toasts = inject(ToastService);
  protected readonly status = inject(ShellStatusService);
  protected readonly banners = inject(BannerService);
  protected readonly showAllToasts = signal(false);
  /** The reader's Your photo dialog, opened from My photo; a parent's opens from Settings. */
  protected readonly photoDialogOpen = signal(false);
  /** Send feedback, opened from either role's menu. */
  protected readonly feedbackDialogOpen = signal(false);
  /** The newest toasts; older ones collapse into a "+N more" line so the stack never covers the page. */
  protected readonly visibleToasts = computed(() => {
    const all = this.toasts.toasts();
    return this.showAllToasts() ? all : all.slice(-MAX_VISIBLE_TOASTS);
  });
  protected readonly hiddenToasts = computed(
    () => this.toasts.toasts().length - this.visibleToasts().length,
  );
  protected readonly home = computed(() =>
    this.session()?.role === 'parent' ? '/review' : '/shelf',
  );
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  constructor() {
    // The grown-up's Review badge is kept fresh from every page, not only from Review itself.
    const reviews = inject(ReviewApi);
    effect(() => {
      if (this.session()?.role !== 'parent') return;
      reviews.load().then((overview) => this.status.queueCount.set(overview.queue.length));
    });
    // After moving to another page keyboard focus would be lost, so put it on the new page's content.
    // The first navigation is the page load itself, where the skip link must stay the first Tab stop.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        skip(1),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.main().nativeElement.focus());
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.inWizard.set(event.urlAfterRedirects.startsWith('/onboarding')));
  }

  /** Sign out ends the session and returns to the sign-in page. */
  protected async chooseFromMenu(id: string) {
    if (id === 'photo') {
      this.photoDialogOpen.set(true);
      return;
    }
    if (id === 'feedback') {
      this.feedbackDialogOpen.set(true);
      return;
    }
    if (id === 'settings') {
      await this.router.navigateByUrl('/settings');
      return;
    }
    await this.sessionService.signOut();
    this.status.streak.set(null);
    this.status.queueCount.set(null);
    await this.router.navigateByUrl('/sign-in');
  }

  protected skipToContent(event: Event) {
    event.preventDefault();
    this.main().nativeElement.focus();
  }

  protected act(id: number, run: () => void) {
    run();
    this.toasts.dismiss(id);
  }
}
