import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Avatar,
  Banner,
  EmptyState,
  ErrorState,
  Segmented,
  SegmentedOption,
  Skeleton,
} from 'components';
import { DirectoryApi, DirectoryList } from '../directory-api';

/** The parent's directory of approved authors and volunteers (L2-153). */
@Component({
  selector: 'sh-directory-page',
  imports: [Avatar, Banner, EmptyState, ErrorState, RouterLink, Segmented, Skeleton],
  templateUrl: './directory-page.html',
  styleUrl: './directory-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DirectoryPage {
  private readonly api = inject(DirectoryApi);

  protected readonly kinds: SegmentedOption[] = [
    { value: 'authors', label: 'Authors' },
    { value: 'volunteers', label: 'Volunteers' },
  ];
  protected readonly kind = signal('authors');
  protected readonly list = signal<DirectoryList | null>(null);
  protected readonly loadFailed = signal(false);

  constructor() {
    this.load();
  }

  protected async load() {
    this.loadFailed.set(false);
    try {
      this.list.set(await this.api.list());
    } catch {
      this.loadFailed.set(true);
    }
  }

  /** The start of someone's about text, for a one-line summary. */
  protected short(text: string) {
    return text.length > 90 ? text.slice(0, 90).trimEnd() + '…' : text;
  }
}
