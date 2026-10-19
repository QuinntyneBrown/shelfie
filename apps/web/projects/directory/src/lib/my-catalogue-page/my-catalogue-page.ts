import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Cover, EmptyState, ErrorState, Skeleton } from 'components';
import { ToastService } from 'core';
import {
  CatalogueBookDialog,
  CatalogueBookSaved,
} from '../catalogue-book-dialog/catalogue-book-dialog';
import { CatalogueBook, MeApi } from '../me-api';
import { RemoveCatalogueBookDialog } from '../remove-catalogue-book-dialog/remove-catalogue-book-dialog';

/** An author's catalogue: the books parents can add to their child's shelf (L2-149 to L2-151). */
@Component({
  selector: 'sh-my-catalogue-page',
  imports: [
    CatalogueBookDialog,
    Cover,
    EmptyState,
    ErrorState,
    RemoveCatalogueBookDialog,
    Skeleton,
  ],
  templateUrl: './my-catalogue-page.html',
  styleUrl: './my-catalogue-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyCataloguePage {
  private readonly api = inject(MeApi);
  private readonly toasts = inject(ToastService);

  protected readonly books = signal<CatalogueBook[] | null>(null);
  protected readonly loadFailed = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<CatalogueBook | null>(null);
  protected readonly removing = signal<CatalogueBook | null>(null);

  constructor() {
    this.load();
  }

  protected async load() {
    this.loadFailed.set(false);
    try {
      this.books.set(await this.api.catalogue());
    } catch {
      this.loadFailed.set(true);
    }
  }

  protected openAdd() {
    this.editing.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(book: CatalogueBook) {
    this.editing.set(book);
    this.dialogOpen.set(true);
  }

  protected saved({ book, added, pictureFailed }: CatalogueBookSaved) {
    this.dialogOpen.set(false);
    this.books.update((books) =>
      added ? [...(books ?? []), book] : (books ?? []).map((b) => (b.id === book.id ? book : b)),
    );
    if (pictureFailed)
      this.toasts.show({
        severity: 'warning',
        title: `${book.title} is saved, but its picture didn’t upload.`,
      });
    else if (added)
      this.toasts.show({
        title: `${book.title} is in your catalogue`,
        text: 'Parents can add it to their child’s shelf once your profile is listed.',
      });
    else this.toasts.show({ title: `${book.title} is saved` });
  }

  protected removed(book: CatalogueBook) {
    this.removing.set(null);
    this.books.update((books) => (books ?? []).filter((b) => b.id !== book.id));
  }
}
