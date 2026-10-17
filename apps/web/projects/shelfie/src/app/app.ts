import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { MenuItem, NavLink, TabBar } from 'components';
import { ReviewApi } from 'review';
import { filter, skip } from 'rxjs';
import { Toast, TopBar } from 'components';
import { SessionService, ShellStatusService, ToastService } from 'core';

const MAX_VISIBLE_TOASTS = 3;

@Component({
  imports: [RouterOutlet, TabBar, Toast, TopBar],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);
  protected readonly session = this.sessionService.current;
  protected readonly navLinks = computed<NavLink[]>(() =>
    this.session()?.role === 'grown_up'
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
    ...(this.session()?.role === 'grown_up' ? [{ id: 'settings', label: 'Settings' }] : []),
    { id: 'switch-reader', label: 'Switch reader' },
    { id: 'sign-out', label: 'Sign out' },
  ]);
  protected readonly menuHeader = computed(() => {
    const s = this.session();
    if (!s) return '';
    return s.role === 'reader' ? `${s.name} · Reader` : `${s.name} · ${s.email} · grown-up`;
  });
  protected readonly toasts = inject(ToastService);
  protected readonly status = inject(ShellStatusService);
  protected readonly showAllToasts = signal(false);
  /** The newest toasts; older ones collapse into a "+N more" line so the stack never covers the page. */
  protected readonly visibleToasts = computed(() => {
    const all = this.toasts.toasts();
    return this.showAllToasts() ? all : all.slice(-MAX_VISIBLE_TOASTS);
  });
  protected readonly hiddenToasts = computed(
    () => this.toasts.toasts().length - this.visibleToasts().length,
  );
  protected readonly home = computed(() =>
    this.session()?.role === 'grown_up' ? '/review' : '/shelf',
  );
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  constructor() {
    // The grown-up's Review badge is kept fresh from every page, not only from Review itself.
    const reviews = inject(ReviewApi);
    effect(() => {
      if (this.session()?.role !== 'grown_up') return;
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
  }

  /** Switch reader and Sign out both end the session and return to the profile picker. */
  protected async chooseFromMenu(id: string) {
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
