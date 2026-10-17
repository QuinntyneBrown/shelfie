import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookCard, RewardCard } from 'components';
import { SessionService } from 'core';
import { ShelfApi, ShelfResponse } from '../shelf-api';

@Component({
  selector: 'sh-shelf-page',
  imports: [BookCard, DatePipe, RewardCard, RouterLink],
  templateUrl: './shelf-page.html',
  styleUrl: './shelf-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelfPage {
  protected readonly session = inject(SessionService);
  protected readonly shelf = signal<ShelfResponse | null>(null);

  constructor() {
    inject(ShelfApi)
      .shelf()
      .then((shelf) => this.shelf.set(shelf));
  }
}
