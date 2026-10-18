import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Avatar } from '../avatar/avatar';
import { Menu, MenuItem } from '../menu/menu';
import { StreakBadge } from '../streak-badge/streak-badge';
import { NavLink } from '../tab-bar/tab-bar';

@Component({
  selector: 'sh-top-bar',
  imports: [Avatar, Menu, RouterLink, RouterLinkActive, StreakBadge],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBar {
  readonly name = input.required<string>();
  readonly color = input.required<string>();
  /** The person's photo, shown on the account button in place of their initial. */
  readonly photo = input<string | null>(null);
  readonly home = input.required<string>();
  /** The grown-up's links, shown from 768px. */
  readonly links = input<NavLink[]>([]);
  /** The reading streak, shown when known. */
  readonly streak = input<number | null>(null);
  readonly menuHeader = input('');
  readonly menuItems = input.required<MenuItem[]>();
  readonly menuSelect = output<string>();
}
