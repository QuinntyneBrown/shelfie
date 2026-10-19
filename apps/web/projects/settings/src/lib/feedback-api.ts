import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';

export interface Feedback {
  kind: 'feel' | 'idea';
  /** 1 to 5, or null when no face was picked. */
  score: number | null;
  message: string | null;
}

/** Feedback from whoever is signed in; only the operator reads it. */
@Injectable({ providedIn: 'root' })
export class FeedbackApi {
  private readonly api = inject(ApiClient);

  send(feedback: Feedback) {
    return this.api.post<{ id: string }>('/feedback', feedback);
  }
}
