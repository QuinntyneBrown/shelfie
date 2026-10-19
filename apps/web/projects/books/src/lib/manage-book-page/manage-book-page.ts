import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  Avatar,
  Banner,
  Button,
  COVER_PICTURE_ERRORS,
  Cover,
  CoverPicker,
  Dialog,
  Progress,
  TextField,
} from 'components';
import { ApiError, ToastService } from 'core';
import { BookDetail, BooksApi, CustomQuestion } from '../books-api';
import { QuestionDialog } from '../question-dialog/question-dialog';
import { SuggestQuestionsDialog } from '../suggest-questions-dialog/suggest-questions-dialog';

@Component({
  selector: 'sh-manage-book-page',
  imports: [
    Avatar,
    Banner,
    Button,
    Cover,
    CoverPicker,
    DatePipe,
    Dialog,
    Progress,
    QuestionDialog,
    RouterLink,
    SuggestQuestionsDialog,
    TextField,
  ],
  templateUrl: './manage-book-page.html',
  styleUrl: './manage-book-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageBookPage {
  private readonly api = inject(BooksApi);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  /** Route parameter. */
  readonly id = input.required<string>();
  protected readonly book = signal<BookDetail | null>(null);
  protected readonly title = signal('');
  protected readonly author = signal('');
  protected readonly chapters = signal('');
  protected readonly titleError = signal<string | null>(null);
  protected readonly chaptersError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly questionOpen = signal(false);
  protected readonly editingQuestion = signal<CustomQuestion | null>(null);
  protected readonly questionBusy = signal(false);
  protected readonly questionFailed = signal(false);
  protected readonly suggestOpen = signal(false);
  protected readonly removeOpen = signal(false);
  protected readonly removing = signal(false);
  protected readonly removeFailed = signal(false);
  protected readonly coverBusy = signal(false);
  /** The picker's error when the server refuses the file. */
  protected readonly coverError = signal<string | null>(null);
  /** The heading of the cover failure banner, and what Try again repeats. */
  protected readonly coverFailure = signal<{ title: string; retry: () => void } | null>(null);
  /** Logged chapters, newest first. */
  protected readonly logged = computed(() =>
    (this.book()?.chapters ?? []).filter((c) => c.log !== null).reverse(),
  );

  constructor() {
    effect(() => {
      this.load(this.id());
    });
  }

  private async load(id: string) {
    try {
      this.show(await this.api.get(id));
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 404) throw e;
      await this.router.navigateByUrl('/not-found', { skipLocationChange: true });
    }
  }

  private show(book: BookDetail) {
    this.book.set(book);
    this.title.set(book.title);
    this.author.set(book.author ?? '');
    this.chapters.set(String(book.chapterCount));
  }

  protected async save() {
    const book = this.book();
    if (!book || this.saving()) return;
    const chapters = Number(this.chapters());
    const floor = Math.max(1, book.loggedCount);
    this.titleError.set(this.title().trim() ? null : 'The book needs a title.');
    this.chaptersError.set(
      !Number.isInteger(chapters) || chapters > 200
        ? 'Enter a number from 1 to 200.'
        : chapters < floor
          ? book.loggedCount
            ? `Enter ${floor} or more. ${book.readerName} has already logged ${floor} chapters.`
            : 'Enter a number from 1 to 200.'
          : null,
    );
    if (this.titleError() || this.chaptersError()) return;

    this.saving.set(true);
    this.saved.set(false);
    try {
      this.show(
        await this.api.update(book.id, {
          title: this.title().trim(),
          author: this.author().trim() || null,
          chapterCount: chapters,
        }),
      );
      this.saved.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  protected async uploadCover(file: File) {
    await this.changeCover(
      { title: 'The picture didn’t upload', retry: () => this.uploadCover(file) },
      async (book) => {
        const { coverImage } = await this.api.uploadCover(book.id, file);
        this.book.set({ ...book, coverImage });
        this.toasts.show({ title: `${book.title} has a new cover.` });
      },
    );
  }

  protected async removeCover() {
    await this.changeCover(
      { title: 'The picture wasn’t removed', retry: () => this.removeCover() },
      async (book) => {
        await this.api.removeCover(book.id);
        this.book.set({ ...book, coverImage: null });
      },
    );
  }

  /** Runs one cover request with the busy state; a refusal shows in the picker, a failure in a banner. */
  private async changeCover(
    failure: { title: string; retry: () => void },
    work: (book: BookDetail) => Promise<void>,
  ) {
    const book = this.book();
    if (!book || this.coverBusy()) return;
    this.coverBusy.set(true);
    this.coverError.set(null);
    this.coverFailure.set(null);
    try {
      await work(book);
    } catch (e) {
      if (e instanceof ApiError && e.type === 'photo-type')
        this.coverError.set(COVER_PICTURE_ERRORS.type);
      else if (e instanceof ApiError && e.type === 'photo-too-large')
        this.coverError.set(COVER_PICTURE_ERRORS.size);
      else if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      else this.coverFailure.set(failure);
    } finally {
      this.coverBusy.set(false);
    }
  }

  protected openAddQuestion() {
    this.editingQuestion.set(null);
    this.questionFailed.set(false);
    this.questionOpen.set(true);
  }

  protected async saveQuestion(text: string) {
    const book = this.book();
    if (!book) return;
    this.questionBusy.set(true);
    this.questionFailed.set(false);
    try {
      const editing = this.editingQuestion();
      if (editing) {
        await this.api.updateQuestion(editing.id, text);
        this.book.set({
          ...book,
          questions: book.questions.map((q) => (q.id === editing.id ? { ...q, text } : q)),
        });
      } else {
        const question = await this.api.addQuestion(book.id, text);
        this.book.set({ ...book, questions: [...book.questions, question] });
      }
      this.questionOpen.set(false);
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.questionFailed.set(true);
    } finally {
      this.questionBusy.set(false);
    }
  }

  /** A suggested question the dialog has just saved joins the list. */
  protected addSuggested(question: CustomQuestion) {
    const book = this.book();
    if (book) this.book.set({ ...book, questions: [...book.questions, question] });
  }

  protected openEditQuestion(question: CustomQuestion) {
    this.editingQuestion.set(question);
    this.questionFailed.set(false);
    this.questionOpen.set(true);
  }

  protected async removeQuestion(question: CustomQuestion) {
    const book = this.book();
    if (!book) return;
    await this.api.removeQuestion(question.id);
    this.book.set({ ...book, questions: book.questions.filter((q) => q.id !== question.id) });
  }

  protected openRemove() {
    this.removeFailed.set(false);
    this.removeOpen.set(true);
  }

  protected async remove() {
    const book = this.book();
    if (!book || this.removing()) return;
    this.removing.set(true);
    this.removeFailed.set(false);
    try {
      await this.api.remove(book.id);
      this.removeOpen.set(false);
      this.toasts.show({ title: `${book.title} removed from the shelf` });
      await this.router.navigateByUrl('/books');
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.removeFailed.set(true);
    } finally {
      this.removing.set(false);
    }
  }
}
