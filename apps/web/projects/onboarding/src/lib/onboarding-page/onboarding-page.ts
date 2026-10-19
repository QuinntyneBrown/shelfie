import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AuthLayout,
  Banner,
  Button,
  Celebration,
  ErrorState,
  StepIndicator,
  Sticker,
  TextField,
} from 'components';
import { ApiError, SessionService } from 'core';
import { GalleryReward, OnboardingApi, ReaderView } from '../onboarding-api';

export type Step = 'welcome' | 'child' | 'sign-in' | 'reward' | 'done';
const STEPS: Step[] = ['welcome', 'child', 'sign-in', 'reward', 'done'];
const COLORS = ['rose', 'sky', 'sun', 'mint', 'lilac'];
const USERNAME_RULE = /^[A-Za-z0-9._]{3,20}$/;
const EXAMPLES = ['Trip to the zoo', 'Movie night', 'New book'];

/** A username from the child's name: lower case, letters, digits, "." and "_" only, at most 20; empty under 3. */
export function usernameFrom(name: string): string {
  const username = name
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, 20);
  return username.length >= 3 ? username : '';
}

/** The one-time set-up wizard after sign-up: five full-screen steps under the auth layout, one per URL. */
@Component({
  selector: 'sh-onboarding-page',
  imports: [
    AuthLayout,
    Banner,
    Button,
    Celebration,
    ErrorState,
    RouterLink,
    StepIndicator,
    Sticker,
    TextField,
  ],
  templateUrl: './onboarding-page.html',
  styleUrl: './onboarding-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPage {
  private readonly api = inject(OnboardingApi);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  /** The step named by the URL; the route without one is the welcome. */
  readonly step = input<Step | undefined>();
  protected readonly current = computed<Step>(() => this.step() ?? 'welcome');
  protected readonly number = computed(() => STEPS.indexOf(this.current()) + 1);
  protected readonly total = STEPS.length;

  // The child's details live here and nowhere else: never in browser storage, and the password is shown once (L2-142).
  protected readonly childName = signal('');
  protected readonly username = signal('');
  protected readonly password = signal('');
  private prefilled = '';
  protected readonly nameError = signal<string | null>(null);
  protected readonly usernameError = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly problems = signal<string[]>([]);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  /** The reader once she is created. */
  protected readonly reader = signal<ReaderView | null>(null);
  protected readonly readerName = computed(() => this.reader()?.name ?? this.childName().trim());
  // The reward step: what is already in the gallery, and the one being typed.
  protected readonly examples = EXAMPLES;
  protected readonly rewards = signal<GalleryReward[]>([]);
  protected readonly rewardName = signal('');
  protected readonly target = signal('');
  protected readonly rewardError = signal<string | null>(null);
  protected readonly targetError = signal<string | null>(null);
  private readonly nameField = viewChild('nameField', { read: ElementRef });
  private readonly summary = viewChild<Banner>('summary');

  /** Set once the household's readers and rewards are known; the step shows only then. */
  protected readonly loaded = signal(false);
  protected readonly loadFailed = signal(false);

  constructor() {
    // A household that has finished or skipped the wizard never sees it again, on any device (L2-137).
    if (this.session.current()?.onboarded) void this.router.navigateByUrl('/review');
    else void this.load();
    // The URL names the step, but only a step whose needs are met shows (L2-143).
    effect(() => {
      if (!this.loaded()) return;
      const allowed = this.allowed(this.current());
      if (allowed !== this.current()) {
        void this.router.navigateByUrl(
          allowed === 'welcome' ? '/onboarding' : `/onboarding/${allowed}`,
          {
            replaceUrl: true,
          },
        );
      }
    });
  }

  /** Reads what the household already has, so a reload or another device resumes where it was (L2-143). */
  protected async load() {
    this.loadFailed.set(false);
    try {
      const [readers, rewards] = await Promise.all([this.api.readers(), this.api.rewards()]);
      this.reader.set(readers[0] ?? null);
      this.rewards.set(rewards);
      this.loaded.set(true);
    } catch {
      this.loadFailed.set(true);
    }
  }

  /** The step the URL may show: nothing past the name until the reader exists, nothing before the reward after. */
  private allowed(step: Step): Step {
    if (this.reader()) return step === 'reward' || step === 'done' ? step : 'reward';
    if (step === 'welcome' || step === 'child') return step;
    return step === 'sign-in' && this.childName().trim() ? 'sign-in' : 'child';
  }

  /** The name step: nothing is sent yet; the username is prefilled from the name (L2-139). */
  protected async nextFromName() {
    const name = this.childName().trim();
    this.nameError.set(
      !name ? 'Enter a name.' : name.length > 40 ? 'Use 40 characters or fewer.' : null,
    );
    if (this.nameError()) {
      this.nameField()?.nativeElement.querySelector('input')?.focus();
      return;
    }
    if (this.username() === this.prefilled) {
      this.prefilled = usernameFrom(name);
      this.username.set(this.prefilled);
    }
    await this.router.navigateByUrl('/onboarding/sign-in');
  }

  /** The sign-in step: creates the reader through the same route and rules as Settings (L2-140). */
  protected async addReader() {
    if (this.busy()) return;
    this.failed.set(false);
    const name = this.childName().trim();
    const username = this.username();
    const password = this.password();
    this.usernameError.set(
      username.length < 3 || username.length > 20
        ? '3–20 characters.'
        : USERNAME_RULE.test(username)
          ? null
          : 'Letters, numbers, . and _ only.',
    );
    this.passwordError.set(password.length < 8 ? 'At least 8 characters.' : null);
    this.summarise({ username: 'Fix the username', password: 'Use 8+ characters' });
    if (this.problems().length) return;

    this.busy.set(true);
    try {
      // The avatar colour is picked here, from the name, and can be changed in Settings.
      this.reader.set(
        await this.api.addReader({
          name,
          color: COLORS[name.length % COLORS.length]!,
          username,
          password,
        }),
      );
    } catch (e) {
      if (e instanceof ApiError && e.type === 'username-taken') {
        this.usernameError.set('That username is taken.');
        this.summarise({ username: 'Username is taken' });
      } else if (e instanceof ApiError && e.status > 0 && e.status < 500) {
        throw e;
      } else {
        this.failed.set(true);
      }
      return;
    } finally {
      this.busy.set(false);
    }
    await this.router.navigateByUrl('/onboarding/reward');
  }

  /**
   * The reward step (L2-141): Add another saves and stays; Next saves what is typed and goes on, or only goes on
   * when the fields are empty and a reward is already listed.
   */
  protected async addReward(stay: boolean) {
    if (this.busy()) return;
    this.failed.set(false);
    const name = this.rewardName().trim();
    const target = Number(this.target());
    if (!stay && !name && !this.target() && this.rewards().length) {
      await this.router.navigateByUrl('/onboarding/done');
      return;
    }
    this.rewardError.set(
      !name ? 'Name the reward.' : name.length > 100 ? 'Use 100 characters or fewer.' : null,
    );
    this.targetError.set(
      Number.isInteger(target) && target >= 1 && target <= 20 ? null : 'Use 1 to 20 books.',
    );
    this.summarise({ reward: 'Name the reward', target: 'Use 1 to 20 books' });
    if (this.problems().length) return;

    this.busy.set(true);
    try {
      const reward = await this.api.addReward({ name, description: '', target });
      this.rewards.update((list) => [...list, reward]);
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.failed.set(true);
      return;
    } finally {
      this.busy.set(false);
    }
    this.rewardName.set('');
    this.target.set('');
    if (!stay) await this.router.navigateByUrl('/onboarding/done');
  }

  /** Skip for now marks the wizard done and opens Review; anything already created stays (L2-138). */
  protected async skip(event: Event) {
    event.preventDefault();
    await this.finish();
  }

  /** Go to my shelf on All set marks the wizard done and opens Review (L2-142). */
  protected async finish() {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.api.finish();
    } finally {
      this.busy.set(false);
    }
    this.session.update({ onboarded: true });
    await this.router.navigateByUrl('/review');
  }

  /** Lists one line per field in error, in form order, and puts focus on the list. */
  private summarise(lines: Partial<Record<'username' | 'password' | 'reward' | 'target', string>>) {
    const errors = {
      username: this.usernameError(),
      password: this.passwordError(),
      reward: this.rewardError(),
      target: this.targetError(),
    };
    this.problems.set(
      (Object.keys(lines) as (keyof typeof lines)[]).filter((f) => errors[f]).map((f) => lines[f]!),
    );
    if (this.problems().length) setTimeout(() => this.summary()?.focus());
  }
}
