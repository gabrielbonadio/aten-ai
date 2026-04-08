import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export type DashboardMetricsResponse = {
  metrics: {
    totalPets: number;
    totalTutors: number;
    appointmentsTodayCount: number;
  };
  todayAppointments: unknown[];
};

const EMPTY_METRICS: DashboardMetricsResponse = {
  metrics: { totalPets: 0, totalTutors: 0, appointmentsTodayCount: 0 },
  todayAppointments: []
};

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  getMetrics(): Observable<DashboardMetricsResponse> {
    const url = `${environment.apiUrl.replace(/\/$/, '')}/dashboard/metrics`;
    return this.http.get<DashboardMetricsResponse>(url).pipe(
      catchError((err) => {
        console.warn(
          '[Dashboard] Não foi possível carregar métricas (sem token, CORS ou API offline).',
          err
        );
        return of(EMPTY_METRICS);
      })
    );
  }
}
