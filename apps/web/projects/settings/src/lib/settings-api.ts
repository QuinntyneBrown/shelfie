import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';

export interface SettingsView {
  reader: { name: string; color: string };
  grownUp: { name: string; email: string };
}

@Injectable({ providedIn: 'root' })
export class SettingsApi {
  private readonly api = inject(ApiClient);

  get() {
    return this.api.get<SettingsView>('/settings');
  }
}
