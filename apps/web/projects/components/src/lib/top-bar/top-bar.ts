import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Menu, MenuItem } from '../menu/menu';

@Component({
  selector: 'sh-top-bar',
  imports: [Menu, RouterLink],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBar {
  readonly name = input.required<string>();
  readonly color = input.required<string>();
  readonly home = input.required<string>();
  readonly menuHeader = input('');
  readonly menuItems = input.required<MenuItem[]>();
  readonly menuSelect = output<string>();
  protected readonly initial = computed(() => this.name().charAt(0));
}
