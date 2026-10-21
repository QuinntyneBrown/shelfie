import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  Banner,
  COVER_PICTURE_ERRORS,
  Cover,
  CoverPicker,
  Dialog,
  TextField,
  Textarea,
} from 'components';
import { ApiError } from 'core';
import { CatalogueBook, MeApi } from '../me-api';

type Field = 'title' | 'chapters';

/** What the dialog reports once the book is saved; the picture may not have made it. */
export interface CatalogueBookSaved {
  book: CatalogueBook;
  added: boolean;
  pictureFailed: boolean;
}

/** Adds a book to the author's catalogue, or edits one, with an optional cover picture (L2-165 to L2-167). */
@Component({
  selector: 'sh-catalogue-book-dialog',
  imports: [Banner, Cover, CoverPicker, Dialog, TextField, Textarea],
  templateUrl: './catalogue-book-dialog.html',
  styleUrl: './catalogue-book-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogueBookDialog {
  private readonly api = inject(MeApi);

  readonly open = input(false);
  /** The book being edited, or null to add one. */
  readonly editing = input<CatalogueBook | null>(null);
  readonly saved = output<CatalogueBookSaved>();
  readonly closed = output<void>();

  protected readonly title = signal('');
  protected readonly chapters = signal('');
  protected readonly description = signal('');
  protected readonly errors = signal<Partial<Record<Field, string>>>({});
  protected readonly problems = signal<string[]>([]);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  protected readonly pictureError = signal<string | null>(null);
  /** A picture chosen here, kept until the book is saved, and its preview URL. */
  private picture: File | null = null;
  protected readonly preview = signal<string | null>(null);
  /** Set when the book's existing picture is to be taken off on save. */
  private readonly pictureRemoved = signal(false);
  protected readonly shownPicture = computed(
    () => this.preview() ?? (this.pictureRemoved() ? null : (this.editing()?.coverImage ?? null)),
  );
  private readonly summary = viewChild<Banner>('summary');

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const book = this.editing();
      untracked(() => this.reset(book));
    });
    inject(DestroyRef).onDestroy(() => this.choosePicture(null));
  }

  /** Starts the form over from the book being edited, or empty. */
  private reset(book: CatalogueBook | null) {
    this.title.set(book?.title ?? '');
    this.chapters.set(book ? String(book.chapterCount) : '');
    this.description.set(book?.description ?? '');
    this.errors.set({});
    this.problems.set([]);
    this.failed.set(false);
    this.pictureError.set(null);
    this.pictureRemoved.set(false);
    this.choosePicture(null);
  }

  protected choosePicture(file: File | null) {
    const old = this.preview();
    if (old) URL.revokeObjectURL(old);
    this.picture = file;
    this.preview.set(file ? URL.createObjectURL(file) : null);
    if (file) this.pictureError.set(null);
  }

  protected removePicture() {
    this.choosePicture(null);
    this.pictureRemoved.set(true);
  }

  protected async save() {
    if (this.busy()) return;
    const title = this.title().trim();
    const chapters = Number(this.chapters());
    const errors: Partial<Record<Field, string>> = {};
    if (!title) errors.title = 'The book needs a title.';
    if (
      this.chapters().trim() === '' ||
      !Number.isInteger(chapters) ||
      chapters < 1 ||
      chapters > 200
    )
      errors.chapters = 'Enter a number from 1 to 200.';
    this.errors.set(errors);
    const lines: Record<Field, string> = {
      title: 'Add a title',
      chapters: 'Fix the number of chapters',
    };
    this.problems.set(
      (Object.keys(lines) as Field[]).filter((f) => errors[f]).map((f) => lines[f]),
    );
    if (this.problems().length) {
      setTimeout(() => this.summary()?.focus());
      return;
    }

    this.busy.set(true);
    this.failed.set(false);
    const input = { title, chapterCount: chapters, description: this.description().trim() };
    const editing = this.editing();
    try {
      let book = editing
        ? await this.api.updateBook(editing.id, input)
        : await this.api.addBook(input);
      let pictureFailed = false;
      // The book is saved either way; its picture is an optional decoration that follows.
      try {
        if (this.picture)
          book = {
            ...book,
            coverImage: (await this.api.uploadCover(book.id, this.picture)).coverImage,
          };
        else if (editing?.coverImage && this.pictureRemoved()) {
          await this.api.removeCover(book.id);
          book = { ...book, coverImage: null };
        }
      } catch (e) {
        if (e instanceof ApiError && e.type === 'photo-type')
          this.pictureError.set(COVER_PICTURE_ERRORS.type);
        pictureFailed = true;
      }
      this.saved.emit({ book, added: !editing, pictureFailed });
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
