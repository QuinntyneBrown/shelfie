import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Menu, MenuItem } from '../menu/menu';
import { NavLink } from '../tab-bar/tab-bar';

@Component({
  selector: 'sh-top-bar',
  imports: [Menu, RouterLink, RouterLinkActive],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBar {
  readonly name = input.required<string>();
  readonly color = input.required<string>();
  readonly home = input.required<string>();
  /** The grown-up's links, shown from 768px. */
  readonly links = input<NavLink[]>([]);
  readonly menuHeader = input('');
  readonly menuItems = input.required<MenuItem[]>();
  readonly menuSelect = output<string>();
  protected readonly initial = computed(() => this.name().charAt(0));
}
