import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'sh-profile-card',
  templateUrl: './profile-card.html',
  styleUrl: './profile-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileCard {
  readonly name = input.required<string>();
  readonly role = input.required<'reader' | 'grown_up'>();
  readonly color = input.required<string>();
  readonly chosen = output<void>();
}
