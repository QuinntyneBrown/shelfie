import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';

export interface SettingsPatch {
  reader: { name: string; color: string };
  grownUp: { name: string; email: string };
}

export interface SettingsView {
  reader: { name: string; color: string };
  grownUp: { name: string; email: string };
}

@Injectable({ providedIn: 'root' })
export class SettingsApi {
  private readonly api = inject(ApiClient);

  save(patch: SettingsPatch) {
    return this.api.patch<SettingsView>('/settings', patch);
  }

  get() {
    return this.api.get<SettingsView>('/settings');
  }
}
