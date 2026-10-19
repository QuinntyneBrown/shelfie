import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Banner, Cover, Dialog } from 'components';
import { ApiError } from 'core';
import { CatalogueBook, MeApi } from '../me-api';

/** Asks before a book leaves the catalogue; families who added it keep their copy (L2-150). */
@Component({
  selector: 'sh-remove-catalogue-book-dialog',
  imports: [Banner, Cover, Dialog],
  templateUrl: './remove-catalogue-book-dialog.html',
  styleUrl: './remove-catalogue-book-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RemoveCatalogueBookDialog {
  private readonly api = inject(MeApi);

  readonly book = input<CatalogueBook | null>(null);
  readonly removed = output<CatalogueBook>();
  readonly closed = output<void>();

  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    effect(() => {
      if (this.book()) this.failed.set(false);
    });
  }

  protected async remove(book: CatalogueBook) {
    if (this.busy()) return;
    this.busy.set(true);
    this.failed.set(false);
    try {
      await this.api.removeBook(book.id);
      this.removed.emit(book);
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
