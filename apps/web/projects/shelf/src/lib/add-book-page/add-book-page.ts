import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  Banner,
  Button,
  COVER_COLORS,
  ColorPicker,
  Cover,
  CoverPicker,
  StickerPicker,
  TextField,
} from 'components';
import { ApiError, ToastService } from 'core';
import { ShelfApi } from '../shelf-api';

@Component({
  selector: 'sh-add-book-page',
  imports: [Banner, Button, ColorPicker, Cover, CoverPicker, RouterLink, StickerPicker, TextField],
  templateUrl: './add-book-page.html',
  styleUrl: './add-book-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddBookPage {
  private readonly api = inject(ShelfApi);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  protected readonly colors = COVER_COLORS;
  protected readonly title = signal('');
  protected readonly author = signal('');
  protected readonly chapters = signal('');
  protected readonly color = signal('sage');
  protected readonly sticker = signal('📚');
  /** The chosen cover picture, kept here until the book is saved, and its preview URL. */
  private picture: File | null = null;
  protected readonly preview = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);
  protected readonly titleError = signal<string | null>(null);
  protected readonly chaptersError = signal<string | null>(null);
  protected readonly problems = computed(() => [
    ...(this.titleError() ? ['Title is missing'] : []),
    ...(this.chaptersError() ? ['Chapters is not a number from 1 to 200'] : []),
  ]);
  protected readonly previewDetail = computed(() => {
    const chapters = Number(this.chapters());
    const count = chapters >= 1 ? `${chapters} chapter${chapters === 1 ? '' : 's'}` : null;
    return [this.author().trim() || 'Unknown author', count].filter(Boolean).join(' · ');
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.choosePicture(null));
  }

  protected choosePicture(file: File | null) {
    const old = this.preview();
    if (old) URL.revokeObjectURL(old);
    this.picture = file;
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
