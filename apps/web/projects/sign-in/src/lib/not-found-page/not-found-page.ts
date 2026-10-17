import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ErrorState } from 'components';
import { SessionService } from 'core';

@Component({
  selector: 'sh-not-found-page',
  imports: [ErrorState, RouterLink],
  templateUrl: './not-found-page.html',
  styleUrl: './not-found-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {
  protected readonly role = inject(SessionService).current()?.role;
}
