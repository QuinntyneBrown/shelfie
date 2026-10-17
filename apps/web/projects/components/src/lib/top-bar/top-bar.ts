import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'sh-top-bar',
  imports: [RouterLink],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBar {
  readonly name = input.required<string>();
  readonly color = input.required<string>();
  readonly home = input.required<string>();
  protected readonly initial = computed(() => this.name().charAt(0));
}
