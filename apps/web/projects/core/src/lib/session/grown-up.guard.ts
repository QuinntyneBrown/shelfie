import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

/** Sends a reader to the grown-ups-only page; use after `authGuard`. */
export const grownUpGuard: CanActivateFn = () =>
  inject(SessionService).current()?.role === 'grown_up'
    ? true
    : inject(Router).createUrlTree(['/forbidden']);
