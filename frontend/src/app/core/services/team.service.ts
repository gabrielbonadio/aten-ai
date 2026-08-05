import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  InviteTeamMemberPayload,
  InviteTeamMemberResponse,
  TeamMember
} from '../models/team-member.model';
import {
  type PaginatedResponse,
  unwrapPaginatedList
} from '../models/pagination.model';

@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly http = inject(HttpClient);

  private baseUrl(): string {
    return `${environment.apiUrl.replace(/\/$/, '')}/users`;
  }

  private httpOpts() {
    return { withCredentials: true as const };
  }

  /** Lista membros do tenant autenticado. */
  listMembers(): Observable<TeamMember[]> {
    return this.http
      .get<PaginatedResponse<TeamMember> | TeamMember[]>(this.baseUrl(), this.httpOpts())
      .pipe(map((body) => unwrapPaginatedList<TeamMember>(body)));
  }

  /**
   * Profissionais para select/filtro da agenda.
   * Em 403 (MEMBER sem GET /users), o caller deve fazer fallback para o usuário logado.
   */
  listProfessionals(): Observable<TeamMember[]> {
    return this.listMembers().pipe(
      map((list) =>
        (Array.isArray(list) ? list : []).filter((m) => m.active !== false && !!m.id)
      )
    );
  }

  /** Convida e-mail para o tenant (ADMIN). */
  invite(payload: InviteTeamMemberPayload): Observable<InviteTeamMemberResponse> {
    return this.http.post<InviteTeamMemberResponse>(
      `${this.baseUrl()}/invites`,
      {
        email: payload.email.trim().toLowerCase(),
        role: payload.role ?? 'MEMBER'
      },
      this.httpOpts()
    );
  }
}
