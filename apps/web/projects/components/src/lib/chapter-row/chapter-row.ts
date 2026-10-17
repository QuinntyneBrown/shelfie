import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** One chapter on the book page: logged, the next to read, or still ahead. */
@Component({
  selector: 'sh-chapter-row',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './chapter-row.html',
  styleUrl: './chapter-row.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChapterRow {
  readonly number = input.required<number>();
  readonly state = input.required<'logged' | 'next' | 'future'>();
  /** Where the row goes when tapped; null makes it a plain, unfocusable row. */
  readonly link = input<unknown[] | null>(null);
  readonly meta = input<string | null>(null);
  readonly status = input<string | null>(null);
}
