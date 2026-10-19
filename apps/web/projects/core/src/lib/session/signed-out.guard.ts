import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { homeOf, SessionService } from './session.service';

/** Sends anyone who is already signed in from the sign-in page to their home page. */
export const signedOutGuard: CanActivateFn = () => {
  const session = inject(SessionService).current();
  if (!session) return true;
  return inject(Router).createUrlTree([homeOf(session)]);
};
