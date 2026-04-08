import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Appointment, CreateAppointmentPayload } from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly http = inject(HttpClient);

  private baseUrl(): string {
    return `${environment.apiUrl.replace(/\/$/, '')}/appointments`;
  }

  findAll(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(this.baseUrl()).pipe(
      catchError((err) => {
        console.warn('[AppointmentService] Falha ao listar agendamentos:', err);
        return of([]);
      })
    );
  }

  create(data: CreateAppointmentPayload): Observable<Appointment> {
    return this.http.post<Appointment>(this.baseUrl(), data);
  }

  update(id: string, data: Partial<CreateAppointmentPayload>): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.baseUrl()}/${encodeURIComponent(id)}`, data);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl()}/${encodeURIComponent(id)}`);
  }
}

