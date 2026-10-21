import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Banner, MenuItem, NavLink, TabBar } from 'components';
import { ReviewApi } from 'review';
import { ProfilePhotoDialog, SendFeedbackDialog } from 'settings';
import { filter, skip } from 'rxjs';
import { Toast, TopBar } from 'components';
import { BannerService, EmailVerificationService, SessionService, ShellStatusService, ToastService, homeOf } from 'core';

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
  /** The Confirm your e-mail page says everything the banner would. */
  private readonly onVerifyPage = signal(false);
  protected readonly navLinks = computed<NavLink[]>(() => {
    const role = this.session()?.role;
    if (role === 'parent' && !this.inWizard())
      return [
        {
          label: 'Review',
          route: '/review',
          icon: 'review',
          badge: this.queueBadge(),
        },
        { label: 'Books', route: '/books', icon: 'books' },
        { label: 'Directory', route: '/directory', icon: 'directory' },
        { label: 'Settings', route: '/settings', icon: 'settings' },
      ];
    // An author's own pages; a volunteer has only My profile, so no tabs (ADR-0026).
    if (role === 'author')
      return [
        { label: 'My profile', route: '/me', icon: 'profile' },
        { label: 'My catalogue', route: '/catalogue', icon: 'catalogue' },
      ];
    return [];
  });
  private readonly queueBadge = computed(() => {
    const count = this.status.queueCount() ?? 0;
    return { count, label: `${count} ${count === 1 ? 'chapter' : 'chapters'} to review` };
  });
  protected readonly menuItems = computed<MenuItem[]>(() => {
    const role = this.session()?.role;
    // Feedback belongs to a household, so an author's or volunteer's menu has only Sign out.
    if (role === 'author' || role === 'volunteer') return [{ id: 'sign-out', label: 'Sign out' }];
    return [
      role === 'parent' ? { id: 'settings', label: 'Settings' } : { id: 'photo', label: 'My photo' },
      { id: 'feedback', label: 'Send feedback' },
      { id: 'sign-out', label: 'Sign out' },
    ];
  });
  protected readonly menuHeader = computed(() => {
    const s = this.session();
    if (!s) return '';
    if (s.role !== 'reader') return `${s.name} · @${s.username} · ${s.role}`;
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
  protected readonly home = computed(() => {
    const current = this.session();
    return current ? homeOf(current) : '/shelf';
  });
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  constructor() {
    // A parent who has not opened the confirm link sees the banner on every shell page until they do (L2-148).
    const verification = inject(EmailVerificationService);
    let verifyBanner: number | null = null;
    effect(() => {
      const session = this.session();
      const show = session?.role === 'parent' && !session.emailVerified && !this.inWizard() && !this.onVerifyPage();
      if (show && verifyBanner === null) {
        verifyBanner = this.banners.show({
          severity: 'info',
          title: 'Confirm your e-mail',
          message: `We sent a link to ${session.email}. Open it to confirm the address is yours.`,
          action: { label: 'Send it again', run: () => verification.resend() },
        });
      } else if (!show && verifyBanner !== null) {
        this.banners.clear(verifyBanner);
        verifyBanner = null;
      }
    });
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
      .subscribe((event) => {
        this.inWizard.set(event.urlAfterRedirects.startsWith('/onboarding'));
        this.onVerifyPage.set(event.urlAfterRedirects.startsWith('/verify-email'));
      });
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
