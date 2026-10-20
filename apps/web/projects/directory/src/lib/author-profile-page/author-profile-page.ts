import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avatar, Cover, ErrorState, Skeleton } from 'components';
import { ApiError } from 'core';
import { AuthorView, DirectoryApi } from '../directory-api';

/** An approved author's profile and catalogue, with Add to shelf on each book (L2-170, L2-173). */
@Component({
  selector: 'sh-author-profile-page',
  imports: [Avatar, Cover, ErrorState, RouterLink, Skeleton],
  templateUrl: './author-profile-page.html',
  styleUrl: './author-profile-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthorProfilePage {
  private readonly api = inject(DirectoryApi);

  /** The author's profile id, from the route. */
  readonly id = input.required<string>();

  protected readonly author = signal<AuthorView | null>(null);
  protected readonly state = signal<'loading' | 'ready' | 'not-found' | 'failed'>('loading');
  protected readonly firstName = computed(() => this.author()?.name.split(' ')[0] ?? '');

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.load(id));
    });
  }

  protected async load(id = this.id()) {
    this.state.set('loading');
    try {
      this.author.set(await this.api.author(id));
      this.state.set('ready');
    } catch (e) {
      // Pending, hidden, erased and unknown profiles all read the same (L2-170).
      this.state.set(e instanceof ApiError && e.status === 404 ? 'not-found' : 'failed');
    }
  }
}
