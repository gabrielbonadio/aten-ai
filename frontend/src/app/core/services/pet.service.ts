import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { CreatePetPayload, Pet } from '../models/pet.model';

@Injectable({ providedIn: 'root' })
export class PetService {
  private readonly http = inject(HttpClient);
  private readonly cachedPets = signal<Pet[] | null>(null);

  private baseUrl(): string {
    return `${environment.apiUrl.replace(/\/$/, '')}/pets`;
  }

  findAll(): Observable<Pet[]> {
    const cached = this.cachedPets();
    if (cached) return of(cached);

    return this.http.get<Pet[]>(this.baseUrl()).pipe(
      map((list) => {
        const safe = Array.isArray(list) ? list : [];
        this.cachedPets.set(safe);
        return safe;
      }),
      catchError((err) => {
        console.warn('[PetService] Falha ao listar pets:', err);
        // Evita cachear erro como lista vazia permanente.
        return of([]);
      })
    );
  }

  create(petData: CreatePetPayload): Observable<Pet> {
    return this.http.post<Pet>(this.baseUrl(), petData);
  }
}

