import { Injectable, inject } from '@angular/core';
import { PickableReader } from 'components';
import { ApiClient } from 'core';

export type SessionKind = 'read-to' | 'helped' | 'read-to-me';

export interface TogetherForm {
  /** Today in the household's time zone, as YYYY-MM-DD. */
  today: string;
  partners: PickableReader[];
}

export interface NewSession {
  partnerId: string;
  kind: SessionKind;
  minutes: number;
  readOn: string;
}

/** Reading-together sessions, from the reader's side. */
@Injectable({ providedIn: 'root' })
export class TogetherApi {
  private readonly api = inject(ApiClient);

  form() {
    return this.api.get<TogetherForm>('/together');
  }

  log(session: NewSession) {
    return this.api.post<{ id: string }>('/together/sessions', session);
  }
}
