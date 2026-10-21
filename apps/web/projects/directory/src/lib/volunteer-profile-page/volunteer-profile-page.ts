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
import { Avatar, Banner, ErrorState, Skeleton } from 'components';
import { ApiError } from 'core';
import { DirectoryApi, VolunteerView } from '../directory-api';

/** An approved volunteer's profile with the contact line they wrote and the no-vetting notice (L2-171, ADR-0024). */
@Component({
  selector: 'sh-volunteer-profile-page',
  imports: [Avatar, Banner, ErrorState, RouterLink, Skeleton],
  templateUrl: './volunteer-profile-page.html',
  styleUrl: './volunteer-profile-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VolunteerProfilePage {
  private readonly api = inject(DirectoryApi);

  /** The volunteer's profile id, from the route. */
  readonly id = input.required<string>();

  protected readonly volunteer = signal<VolunteerView | null>(null);
  protected readonly state = signal<'loading' | 'ready' | 'not-found' | 'failed'>('loading');
  protected readonly firstName = computed(() => this.volunteer()?.name.split(' ')[0] ?? '');

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.load(id));
    });
  }

  protected async load(id = this.id()) {
    this.state.set('loading');
    try {
      this.volunteer.set(await this.api.volunteer(id));
      this.state.set('ready');
    } catch (e) {
      this.state.set(e instanceof ApiError && e.status === 404 ? 'not-found' : 'failed');
    }
  }
}
