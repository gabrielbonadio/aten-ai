import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Tutor } from '../models/tutor.model';

@Injectable({ providedIn: 'root' })
export class TutorService {
  private readonly http = inject(HttpClient);

  /** Não engole erros: 401/403/500 propagam para o componente tratar. */
  findAll(): Observable<Tutor[]> {
    const url = `${environment.apiUrl.replace(/\/$/, '')}/tutors`;
    return this.http.get<Tutor[]>(url);
  }
}
