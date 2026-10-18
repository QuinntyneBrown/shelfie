import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';
import { InviteView } from './settings-api';

@Injectable({ providedIn: 'root' })
export class InvitesApi {
  private readonly api = inject(ApiClient);

  send(email: string) {
    return this.api.post<InviteView>('/invites', { email });
  }
}
