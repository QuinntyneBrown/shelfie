import { ErrorHandler, Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiError } from '../api/api-client';

/** Shows the Offline page or the Something went wrong page for an unhandled failure; other errors are only logged. */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly router = inject(Router);

  handleError(error: unknown) {
    console.error(error);
    if (error instanceof ApiError && error.status === 0 && !navigator.onLine) {
      this.router.navigate(['/offline'], { queryParams: { from: this.router.url } });
    } else if (error instanceof ApiError && error.status >= 500) {
      this.router.navigate(['/error'], {
        queryParams: { requestId: String(error.body['requestId'] ?? ''), from: this.router.url },
      });
    }
  }
}
