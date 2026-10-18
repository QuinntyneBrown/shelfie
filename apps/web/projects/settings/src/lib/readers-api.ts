import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';
import { ReaderView } from './settings-api';

export interface ReaderInput {
  name: string;
  color: string;
  username: string;
  password?: string;
}

@Injectable({ providedIn: 'root' })
export class ReadersApi {
  private readonly api = inject(ApiClient);

  add(input: ReaderInput) {
    return this.api.post<ReaderView>('/readers', input);
  }

  update(id: string, input: ReaderInput) {
    return this.api.patch<ReaderView>(`/readers/${id}`, input);
  }
}
