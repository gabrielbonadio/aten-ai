import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { CreateTutorPayload, Tutor } from '../models/tutor.model';

@Injectable({ providedIn: 'root' })
export class TutorService {
  private readonly http = inject(HttpClient);
  private readonly cachedTutors = signal<Tutor[] | null>(null);

  private baseUrl(): string {
    return `${environment.apiUrl.replace(/\/$/, '')}/tutors`;
  }

  invalidateCache(): void {
    this.cachedTutors.set(null);
  }

  /**
   * Lista tutores. Opcionalmente filtra no servidor por nome/e-mail (`search`).
   * Cache só aplica quando `search` está vazio (lista completa).
   */
  findAll(search?: string): Observable<Tutor[]> {
    const q = search?.trim();
    if (q) {
      const params = new HttpParams().set('search', q);
      return this.http.get<Tutor[]>(this.baseUrl(), { params }).pipe(
        map((list) => (Array.isArray(list) ? list : [])),
        catchError((err) => {
          console.warn('[TutorService] Falha ao listar tutores:', err);
          return of([]);
        })
      );
    }

    const cached = this.cachedTutors();
    if (cached) return of(cached);

    return this.http.get<Tutor[]>(this.baseUrl()).pipe(
      map((list) => {
        const safe = Array.isArray(list) ? list : [];
        this.cachedTutors.set(safe);
        return safe;
      }),
      catchError((err) => {
        console.warn('[TutorService] Falha ao listar tutores:', err);
        return of([]);
      })
    );
  }

  findOne(id: string): Observable<Tutor> {
    return this.http.get<Tutor>(`${this.baseUrl()}/${encodeURIComponent(id)}`);
  }

  create(data: CreateTutorPayload): Observable<Tutor> {
    return this.http.post<Tutor>(this.baseUrl(), data).pipe(
      tap(() => this.invalidateCache())
    );
  }

  update(id: string, data: Partial<CreateTutorPayload>): Observable<Tutor> {
    return this.http.put<Tutor>(`${this.baseUrl()}/${encodeURIComponent(id)}`, data).pipe(
      tap(() => this.invalidateCache())
    );
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl()}/${encodeURIComponent(id)}`).pipe(
      tap(() => this.invalidateCache())
    );
  }
}
