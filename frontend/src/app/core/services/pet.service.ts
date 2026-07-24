import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LIST_PAGE_SIZE,
  UI_PAGE_SIZE,
  type PaginatedResponse,
  unwrapPaginatedList,
  unwrapPaginatedResponse
} from '../models/pagination.model';
import type { CreatePetPayload, Pet } from '../models/pet.model';
import type { Appointment } from '../models/appointment.model';
import type { MedicalRecord } from '../models/medical-record.model';

@Injectable({ providedIn: 'root' })
export class PetService {
  private readonly http = inject(HttpClient);
  private readonly cachedPets = signal<Pet[] | null>(null);

  private baseUrl(): string {
    return `${environment.apiUrl.replace(/\/$/, '')}/pets`;
  }

  /** Lista paginada para a tela de pets. */
  findPage(page = 1, pageSize = UI_PAGE_SIZE): Observable<PaginatedResponse<Pet>> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    return this.http.get<PaginatedResponse<Pet> | Pet[]>(this.baseUrl(), { params }).pipe(
      map((body) => unwrapPaginatedResponse<Pet>(body)),
      catchError((err) => {
        console.warn('[PetService] Falha ao listar pets:', err);
        return of({
          data: [],
          meta: { page, pageSize, total: 0, totalPages: 0 }
        });
      })
    );
  }

  /** Lista ampla (dropdowns / cache). */
  findAll(): Observable<Pet[]> {
    const cached = this.cachedPets();
    if (cached) return of(cached);

    const params = new HttpParams().set('page', '1').set('pageSize', String(LIST_PAGE_SIZE));

    return this.http.get<PaginatedResponse<Pet> | Pet[]>(this.baseUrl(), { params }).pipe(
      map((body) => {
        const safe = unwrapPaginatedList<Pet>(body);
        this.cachedPets.set(safe);
        return safe;
      }),
      catchError((err) => {
        console.warn('[PetService] Falha ao listar pets:', err);
        return of([]);
      })
    );
  }

  invalidateCache(): void {
    this.cachedPets.set(null);
  }

  create(petData: CreatePetPayload): Observable<Pet> {
    return this.http.post<Pet>(this.baseUrl(), petData).pipe(
      tap(() => {
        this.invalidateCache();
      })
    );
  }

  update(id: string, data: Partial<CreatePetPayload>): Observable<Pet> {
    return this.http.put<Pet>(`${this.baseUrl()}/${encodeURIComponent(id)}`, data).pipe(
      tap(() => {
        this.invalidateCache();
      })
    );
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl()}/${encodeURIComponent(id)}`).pipe(
      tap(() => {
        this.invalidateCache();
      })
    );
  }

  findById(id: string): Observable<Pet & { appointments?: Appointment[]; medicalRecords?: MedicalRecord[] }> {
    const url = `${this.baseUrl()}/${encodeURIComponent(id)}`;
    return this.http.get<Pet & { appointments?: Appointment[]; medicalRecords?: MedicalRecord[] }>(url).pipe(
      catchError((err) => {
        console.warn('[PetService] Falha ao carregar pet:', err);
        return of({
          id,
          name: '—',
          species: null,
          breed: null,
          birthDate: null,
          weight: null,
          tutorId: '',
          tutor: null,
          appointments: [],
          medicalRecords: []
        });
      })
    );
  }
}
