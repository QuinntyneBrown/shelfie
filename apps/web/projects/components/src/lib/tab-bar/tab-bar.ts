import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface NavLink {
  label: string;
  route: string;
  icon: 'review' | 'books' | 'settings';
}

/** The grown-up's navigation on phones, fixed to the bottom edge; hidden from 768px where the top bar takes over. */
@Component({
  selector: 'sh-tab-bar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './tab-bar.html',
  styleUrl: './tab-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabBar {
  readonly links = input.required<NavLink[]>();

  protected readonly paths: Record<NavLink['icon'], string> = {
    review: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z',
    books: 'M3 4h18M3 20h18M6 4v16M10 4v16M14 4v16l4-2V4',
    settings:
      'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19 12l2-1.5-2-3.4-2.3.9-1.7-1L14.5 3h-5l-.4 2.4-1.7 1-2.3-.9-2 3.4L5 12l-2 1.5 2 3.4 2.3-.9 1.7 1 .4 2.4h5l.4-2.4 1.7-1 2.3.9 2-3.4z',
  };
}
