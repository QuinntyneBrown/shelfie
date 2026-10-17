import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

/** Sends anyone without a session to the sign-in page. */
export const authGuard: CanActivateFn = () =>
  inject(SessionService).current() ? true : inject(Router).createUrlTree(['/sign-in']);
