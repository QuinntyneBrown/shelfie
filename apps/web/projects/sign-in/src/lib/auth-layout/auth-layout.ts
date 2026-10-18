import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The centred card with the Shelfie logo that every page outside the shell sits in. */
@Component({
  selector: 'sh-auth-layout',
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {}
