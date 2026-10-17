import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookCard, EmptyState, RewardCard } from 'components';
import { SessionService } from 'core';
import { ShelfApi, ShelfResponse } from '../shelf-api';

@Component({
  selector: 'sh-shelf-page',
  imports: [BookCard, DatePipe, EmptyState, RewardCard, RouterLink],
  templateUrl: './shelf-page.html',
  styleUrl: './shelf-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelfPage {
  protected readonly session = inject(SessionService);
  protected readonly shelf = signal<ShelfResponse | null>(null);
  protected readonly isEmpty = computed(() => {
    const shelf = this.shelf();
    return shelf !== null && !shelf.reading.length && !shelf.upNext.length && !shelf.finished.length;
  });

  constructor() {
    inject(ShelfApi)
      .shelf()
      .then((shelf) => this.shelf.set(shelf));
  }
}
