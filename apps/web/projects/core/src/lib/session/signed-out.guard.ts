import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService, homeOf } from './session.service';

/** Sends anyone who is already signed in from the sign-in page to their home page. */
export const signedOutGuard: CanActivateFn = () => {
  const role = inject(SessionService).current()?.role;
  if (!role) return true;
  return inject(Router).createUrlTree([homeOf(role)]);
};
