import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SessionService } from 'core';

@Component({
  selector: 'sh-shelf-page',
  templateUrl: './shelf-page.html',
  styleUrl: './shelf-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelfPage {
  protected readonly session = inject(SessionService);
}
