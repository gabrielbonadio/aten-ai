import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { CreateMedicalRecordPayload, MedicalRecord } from '../models/medical-record.model';

@Injectable({ providedIn: 'root' })
export class MedicalRecordService {
  private readonly http = inject(HttpClient);

  private baseUrl(): string {
    return `${environment.apiUrl.replace(/\/$/, '')}/medical-records`;
  }

  create(payload: CreateMedicalRecordPayload): Observable<MedicalRecord> {
    return this.http.post<MedicalRecord>(this.baseUrl(), payload);
  }

  listByPet(petId: string): Observable<MedicalRecord[]> {
    const url = `${environment.apiUrl.replace(/\/$/, '')}/pets/${encodeURIComponent(petId)}/medical-records`;
    return this.http.get<MedicalRecord[]>(url);
  }
}
