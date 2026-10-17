import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookCard, EmptyState, RewardCard, Skeleton } from 'components';
import { SessionService, ShellStatusService } from 'core';
import { ShelfApi, ShelfResponse } from '../shelf-api';

@Component({
  selector: 'sh-shelf-page',
  imports: [BookCard, DatePipe, EmptyState, RewardCard, RouterLink, Skeleton],
  templateUrl: './shelf-page.html',
  styleUrl: './shelf-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelfPage {
  protected readonly session = inject(SessionService);
  protected readonly shelf = signal<ShelfResponse | null>(null);
  protected readonly failed = signal(false);
  private readonly api = inject(ShelfApi);
  private readonly status = inject(ShellStatusService);

  protected readonly isEmpty = computed(() => {
    const shelf = this.shelf();
    return (
      shelf !== null && !shelf.reading.length && !shelf.upNext.length && !shelf.finished.length
    );
  });

  constructor() {
    this.load();
  }

  protected async load() {
    this.failed.set(false);
    try {
      const shelf = await this.api.shelf();
      this.shelf.set(shelf);
      this.status.streak.set(shelf.streak);
    } catch {
      this.failed.set(true);
    }
  }
}
