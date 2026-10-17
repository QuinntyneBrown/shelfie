import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Button, COVER_COLORS, ColorPicker, StickerPicker, TextField } from 'components';
import { ToastService } from 'core';
import { ShelfApi } from '../shelf-api';

@Component({
  selector: 'sh-add-book-page',
  imports: [Button, ColorPicker, RouterLink, StickerPicker, TextField],
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
  protected readonly saving = signal(false);

  protected async submit() {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const title = this.title().trim();
      await this.api.addBook({
        title,
        author: this.author().trim(),
        chapterCount: Number(this.chapters()),
        coverColor: this.color(),
        sticker: this.sticker(),
      });
      this.toasts.show({ title: `${title} is on your shelf under Up next.` });
      await this.router.navigateByUrl('/shelf');
    } finally {
      this.saving.set(false);
    }
  }
}
