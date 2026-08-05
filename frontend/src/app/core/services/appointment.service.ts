import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LIST_PAGE_SIZE,
  type PaginatedResponse,
  unwrapPaginatedList
} from '../models/pagination.model';
import type {
  Appointment,
  AppointmentAssigneeFilter,
  AppointmentStatusCode,
  CreateAppointmentPayload,
  UpdateAppointmentStatusPayload
} from '../models/appointment.model';

export type ListAppointmentsOptions = {
  /** `me` ou UUID do profissional. */
  assignedUserId?: AppointmentAssigneeFilter | null;
};

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly http = inject(HttpClient);

  private baseUrl(): string {
    return `${environment.apiUrl.replace(/\/$/, '')}/appointments`;
  }

  findAll(options?: ListAppointmentsOptions): Observable<Appointment[]> {
    let params = new HttpParams().set('page', '1').set('pageSize', String(LIST_PAGE_SIZE));
    const assignee = options?.assignedUserId?.trim();
    if (assignee) {
      params = params.set('assignedUserId', assignee);
    }
    return this.http
      .get<PaginatedResponse<Appointment> | Appointment[]>(this.baseUrl(), { params })
      .pipe(
        map((body) => unwrapPaginatedList<Appointment>(body)),
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

  updateStatus(id: string, status: AppointmentStatusCode): Observable<Appointment> {
    const body: UpdateAppointmentStatusPayload = { status };
    return this.http.patch<Appointment>(
      `${this.baseUrl()}/${encodeURIComponent(id)}/status`,
      body
    );
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl()}/${encodeURIComponent(id)}`);
  }
}
