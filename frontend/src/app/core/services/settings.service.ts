import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { TenantSettings, UpdateTenantSettingsPayload } from '../models/tenant-settings.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);

  private baseUrl(): string {
    return `${environment.apiUrl.replace(/\/$/, '')}/settings`;
  }

  get(): Observable<TenantSettings> {
    return this.http.get<TenantSettings>(this.baseUrl());
  }

  update(payload: UpdateTenantSettingsPayload): Observable<TenantSettings> {
    return this.http.put<TenantSettings>(this.baseUrl(), payload);
  }
}
