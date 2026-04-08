import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Usuário retornado por GET /auth/me. */
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: number;
}

/** Chave principal (comum em tutoriais); mantemos compatibilidade com a chave antiga. */
const STORAGE_KEY_PRIMARY = 'token';
const STORAGE_KEY_LEGACY = 'aten-ai.access_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private apiBase(): string {
    return environment.apiUrl.replace(/\/$/, '');
  }

  /** Dados do profissional logado (nome para receituário, etc.). */
  getMe(): Observable<{ user: CurrentUser }> {
    return this.http.get<{ user: CurrentUser }>(`${this.apiBase()}/auth/me`);
  }

  /** Token atual (localStorage ou fallback de dev em environment). */
  getToken(): string | null {
    try {
      const primary = localStorage.getItem(STORAGE_KEY_PRIMARY);
      if (primary?.trim()) {
        return primary.trim();
      }
      const legacy = localStorage.getItem(STORAGE_KEY_LEGACY);
      if (legacy?.trim()) {
        return legacy.trim();
      }
    } catch {
      // storage indisponível (ex.: modo privado restrito)
    }

    if (!environment.production && environment.devJwtToken?.trim()) {
      return environment.devJwtToken.trim();
    }

    return null;
  }

  setToken(token: string): void {
    const v = token.trim();
    try {
      localStorage.setItem(STORAGE_KEY_PRIMARY, v);
      localStorage.setItem(STORAGE_KEY_LEGACY, v);
    } catch {
      // ignore
    }
  }

  clearToken(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_PRIMARY);
      localStorage.removeItem(STORAGE_KEY_LEGACY);
    } catch {
      // ignore
    }
  }

  hasToken(): boolean {
    return this.getToken() !== null;
  }
}
