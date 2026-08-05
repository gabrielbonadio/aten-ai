import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  CreatePetVaccinationPayload,
  PetVaccination
} from '../models/pet-vaccination.model';
import {
  type PaginatedResponse,
  unwrapPaginatedList
} from '../models/pagination.model';

@Injectable({ providedIn: 'root' })
export class PetVaccinationService {
  private readonly http = inject(HttpClient);

  private apiBase(): string {
    return environment.apiUrl.replace(/\/$/, '');
  }

  private httpOpts() {
    return { withCredentials: true as const };
  }

  /** Lista vacinas do pet (mais recentes primeiro no UI). */
  listByPet(petId: string): Observable<PetVaccination[]> {
    const url = `${this.apiBase()}/pets/${encodeURIComponent(petId)}/vaccinations`;
    return this.http
      .get<PaginatedResponse<PetVaccination> | PetVaccination[]>(url, this.httpOpts())
      .pipe(map((body) => unwrapPaginatedList<PetVaccination>(body)));
  }

  /** Registra vacina aplicada + próxima dose. */
  create(payload: CreatePetVaccinationPayload): Observable<PetVaccination> {
    const { petId, ...body } = payload;
    return this.http.post<PetVaccination>(
      `${this.apiBase()}/pets/${encodeURIComponent(petId)}/vaccinations`,
      {
        name: body.name.trim(),
        appliedAt: body.appliedAt,
        nextDueAt: body.nextDueAt ?? null
      },
      this.httpOpts()
    );
  }
}
