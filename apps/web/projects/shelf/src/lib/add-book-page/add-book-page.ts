import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  Banner,
  Button,
  COVER_COLORS,
  ColorPicker,
  Combobox,
  ComboboxOption,
  ComboboxStatus,
  Cover,
  CoverGallery,
  CoverPicker,
  Dialog,
  EmptyState,
  StickerPicker,
  TextField,
} from 'components';
import { ApiError, ToastService } from 'core';
import { BookMatch, ShelfApi, catalogueCoverUrl } from '../shelf-api';

/** Typing pauses this long before a title is looked up, and needs this many characters first. */
const LOOKUP_DELAY_MS = 300;
const LOOKUP_MIN_CHARS = 3;
const SUGGESTED_NOTE =
  'Not in the book catalogue, so these are guesses. Check them before you add the book.';

@Component({
  selector: 'sh-add-book-page',
  imports: [
    Banner,
    Button,
    ColorPicker,
    Combobox,
    Cover,
    CoverGallery,
    CoverPicker,
    Dialog,
    EmptyState,
    RouterLink,
    StickerPicker,
    TextField,
  ],
  templateUrl: './add-book-page.html',
  styleUrl: './add-book-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddBookPage {
  private readonly api = inject(ShelfApi);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  /** A directory catalogue book to fill the form in from (`?catalogueBook=`, ADR-0025). */
  readonly catalogueBook = input<string>();
  /** The author whose catalogue filled the form in. */
  protected readonly fromCatalogue = signal<string | null>(null);
  protected readonly unavailable = signal(false);
  protected readonly colors = COVER_COLORS;
  protected readonly title = signal('');
  protected readonly author = signal('');
  protected readonly chapters = signal('');
  protected readonly color = signal('sage');
  protected readonly sticker = signal('📚');
  /** The chosen cover picture, kept here until the book is saved, and its preview URL. */
  private picture: File | null = null;
  /** The catalogue cover the picture came from, so the gallery can show which one is in use. */
  private pictureUrl: string | null = null;
  protected readonly preview = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);
  protected readonly titleError = signal<string | null>(null);
  protected readonly chaptersError = signal<string | null>(null);
  protected readonly problems = computed(() => [
    ...(this.titleError() ? ['Title is missing'] : []),
    ...(this.chaptersError() ? ['Chapters is not a number from 1 to 200'] : []),
  ]);
  /** The books found for the typed title, as rows for the combobox, and how the lookup stands. */
  protected readonly matches = signal<ComboboxOption[]>([]);
  protected readonly lookup = signal<ComboboxStatus>('idle');
  protected readonly matchNote = computed(() =>
    this.matches().some((match) => match.suggested) ? SUGGESTED_NOTE : null,
  );
  /** The picked catalogue match whose other covers can be browsed, for as long as the title is left as it was. */
  private readonly pickedWork = signal<{ key: string; title: string } | null>(null);
  protected readonly canBrowseCovers = computed(() => {
    const work = this.pickedWork();
    return !!work && this.title() === work.title;
  });
  protected readonly coversOpen = signal(false);
  protected readonly coverUrls = signal<string[]>([]);
  protected readonly coversStatus = signal<'loading' | 'ready' | 'failed'>('loading');
  protected readonly galleryChoice = signal<string | null>(null);
  private found: BookMatch[] = [];
  private lookupTimer: ReturnType<typeof setTimeout> | null = null;
  private lookupController: AbortController | null = null;
  /** The title the current rows answer, so a picked title is not looked up again. */
  private lookedUp = '';
  private readonly chaptersField = viewChild.required('chaptersField', { read: ElementRef });
  protected readonly previewDetail = computed(() => {
    const chapters = Number(this.chapters());
    const count = chapters >= 1 ? `${chapters} chapter${chapters === 1 ? '' : 's'}` : null;
    return [this.author().trim() || 'Unknown author', count].filter(Boolean).join(' · ');
  });

  constructor() {
    effect(() => {
      const title = this.title();
      untracked(() => this.scheduleLookup(title));
    });
    effect(() => {
      const id = this.catalogueBook();
      if (id) untracked(() => this.prefill(id));
    });
    inject(DestroyRef).onDestroy(() => {
      this.choosePicture(null);
      this.cancelLookup();
    });
  }

  private cancelLookup() {
    if (this.lookupTimer) clearTimeout(this.lookupTimer);
    this.lookupTimer = null;
    this.lookupController?.abort();
    this.lookupController = null;
  }

  /** Looks the title up after a pause; typing again starts over, so only the newest answer is shown. */
  private scheduleLookup(title: string) {
    const query = title.trim();
    if (query === this.lookedUp) return;
    this.cancelLookup();
    if (query.length < LOOKUP_MIN_CHARS) {
      this.lookedUp = '';
      this.found = [];
      this.matches.set([]);
      this.lookup.set('idle');
      return;
    }
    // A note about the last lookup is stale as soon as she types again; rows stay until the new answer.
    if (this.lookup() !== 'searching') this.lookup.set('idle');
    this.lookupTimer = setTimeout(() => this.runLookup(query), LOOKUP_DELAY_MS);
  }

  private async runLookup(query: string) {
    const controller = new AbortController();
    this.lookupController = controller;
    this.lookedUp = query;
    this.matches.set([]);
    this.lookup.set('searching');
    try {
      const { matches } = await this.api.searchBooks(query, controller.signal);
      if (controller.signal.aborted) return;
      this.found = matches;
      this.matches.set(matches.map(toOption));
      this.lookup.set(matches.length ? 'idle' : 'empty');
    } catch {
      // A failed, timed-out or limited lookup is only a missed convenience: the form works by hand.
      if (controller.signal.aborted) return;
      this.found = [];
      this.matches.set([]);
      this.lookup.set('failed');
    }
  }

  /** Fills the form from the picked match; every value stays hers to change before the book is added. */
  protected async pick(option: ComboboxOption) {
    const match = this.found[Number(option.id)];
    if (!match) return;
    this.cancelLookup();
    this.lookedUp = match.title;
    this.found = [];
    this.matches.set([]);
    this.lookup.set('idle');
    this.title.set(match.title);
    this.pickedWork.set(match.workKey ? { key: match.workKey, title: match.title } : null);
    if (match.author) this.author.set(match.author);
    if (match.chapterCount) this.chapters.set(String(match.chapterCount));
    // The catalogue states no chapter count, so the next thing to do is count them.
    else this.chaptersField().nativeElement.querySelector('input')?.focus();
    if (match.coverId) {
      // A cover the API cannot fetch or refuses is only a missed convenience; the colour and sticker stay.
      const picture = await this.api.catalogueCover(match.coverId).catch(() => null);
      if (picture && this.title() === match.title) this.choosePicture(picture, catalogueCoverUrl(match.coverId));
    }
  }

  /** Fills the form in from a listed author's catalogue book; the household's book will be its own copy. */
  private async prefill(id: string) {
    try {
      const book = await this.api.catalogueBook(id);
      // Already filled in, so the title is not looked up.
      this.lookedUp = book.title;
      this.title.set(book.title);
      this.author.set(book.author);
      this.chapters.set(String(book.chapterCount));
      this.fromCatalogue.set(book.author);
      if (book.coverImage) {
        // A cover that does not arrive is only a missed convenience; the colour and sticker stay.
        const picture = await this.api.catalogueBookCover(book.coverImage).catch(() => null);
        if (picture) this.choosePicture(picture);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) this.unavailable.set(true);
    }
  }

  /** Opens the gallery of the picked book's other covers, with the one in use selected. */
  protected openCovers() {
    this.galleryChoice.set(this.pictureUrl);
    this.coversOpen.set(true);
    return this.loadCovers();
  }

  protected async loadCovers() {
    const work = this.pickedWork();
    if (!work) return;
    this.coversStatus.set('loading');
    try {
      const ids = await this.api.catalogueCovers(work.key);
      this.coverUrls.set(ids.map((id) => catalogueCoverUrl(String(id))));
      this.coversStatus.set('ready');
    } catch {
      this.coversStatus.set('failed');
    }
  }

  /** Makes the chosen cover the picture, as a pick does; choosing the one already in use changes nothing. */
  protected async useCover() {
    const url = this.galleryChoice();
    if (!url || url === this.pictureUrl) return this.coversOpen.set(false);
    try {
      this.choosePicture(await this.api.catalogueCover(url.split('/').pop()!), url);
      this.coversOpen.set(false);
    } catch {
      this.coversStatus.set('failed');
    }
  }

  protected choosePicture(file: File | null, catalogueUrl: string | null = null) {
    const old = this.preview();
    if (old) URL.revokeObjectURL(old);
    this.picture = file;
    this.pictureUrl = catalogueUrl;
    this.preview.set(file ? URL.createObjectURL(file) : null);
  }

  protected async submit() {
    if (this.saving()) return;
    this.titleError.set(this.title().trim() ? null : 'The book needs a title.');
    const chapters = Number(this.chapters());
    this.chaptersError.set(
      this.chapters().trim() !== '' &&
        Number.isInteger(chapters) &&
        chapters >= 1 &&
        chapters <= 200
        ? null
        : 'Enter a number from 1 to 200.',
    );
    if (this.problems().length) return;
    this.saving.set(true);
    this.failed.set(false);
    try {
      const title = this.title().trim();
      const { id } = await this.api.addBook({
        title,
        author: this.author().trim(),
        chapterCount: Number(this.chapters()),
        coverColor: this.color(),
        sticker: this.sticker(),
      });
      this.toasts.show({ title: `${title} is on your shelf under Up next.` });
      if (this.picture) {
        // The book is saved either way; a picture that does not make it is only an optional decoration.
        await this.api.addCover(id, this.picture).catch(() =>
          this.toasts.show({
            severity: 'warning',
            title: `${title} is on your shelf, but its picture didn’t upload.`,
          }),
        );
      }
      await this.router.navigateByUrl('/shelf');
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.failed.set(true);
    } finally {
      this.saving.set(false);
    }
  }
}

/** A match as a row: its author and chapter count on one line, its cover through the API. */
function toOption(match: BookMatch, index: number): ComboboxOption {
  const chapters = match.chapterCount ? `${match.chapterCount} chapters` : null;
  return {
    id: String(index),
    title: match.title,
    detail: [match.author ?? 'Unknown author', chapters].filter(Boolean).join(' · '),
    image: match.coverId ? catalogueCoverUrl(match.coverId) : null,
    suggested: match.suggested,
  };
}
