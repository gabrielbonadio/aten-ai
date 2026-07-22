import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { isJwtExpired } from '../utils/jwt.util';

/** Usuário retornado por GET /auth/me ou POST /auth/login. */
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: number;
}

export interface AuthResponse {
  token: string;
  user: CurrentUser;
  tenant?: {
    id: number;
    name: string;
    slug: string;
  };
}

export interface SignUpPayload {
  tenantName: string;
  userName: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/** Chave principal (comum em tutoriais); mantemos compatibilidade com a chave antiga. */
const STORAGE_KEY_PRIMARY = 'token';
const STORAGE_KEY_LEGACY = 'aten-ai.access_token';
const STORAGE_KEY_USER = 'user_data';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  // Estado reativo para avisar o Angular se o usuário está logado
  private loggedIn = new BehaviorSubject<boolean>(this.isTokenValid());
  isLoggedIn$ = this.loggedIn.asObservable();

  private apiBase(): string {
    return environment.apiUrl.replace(/\/$/, '');
  }

  /** Cadastro multi-tenant: cria clínica + admin e salva a sessão. */
  signUp(payload: SignUpPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiBase()}/auth/signup`, payload).pipe(
      tap((response) => {
        this.setToken(response.token);
        this.setUserData(response.user);
        this.loggedIn.next(true);
      })
    );
  }

  /** Realiza o login e salva os dados na sessão. */
  login(credentials: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiBase()}/auth/login`, credentials).pipe(
      tap((response) => {
        this.setToken(response.token);
        this.setUserData(response.user);
        this.loggedIn.next(true);
      })
    );
  }

  /**
   * Solicita e-mail de recuperação.
   * O backend sempre responde sucesso (204) para não vazar se o e-mail existe.
   */
  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.apiBase()}/auth/forgot-password`, { email });
  }

  /** Redefine a senha com o token recebido por e-mail. */
  resetPassword(token: string, password: string): Observable<void> {
    return this.http.post<void>(`${this.apiBase()}/auth/reset-password`, { token, password });
  }

  /** Desloga o usuário limpando o storage e o estado. */
  logout(): void {
    this.clearToken();
    this.loggedIn.next(false);
  }

  /** Dados do profissional logado (nome para receituário, etc.). */
  getMe(): Observable<{ user: CurrentUser }> {
    return this.http.get<{ user: CurrentUser }>(`${this.apiBase()}/auth/me`);
  }

  /** Token atual persistido no localStorage após login. */
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

  private setUserData(user: CurrentUser): void {
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } catch {
      // ignore
    }
  }

  clearToken(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_PRIMARY);
      localStorage.removeItem(STORAGE_KEY_LEGACY);
      localStorage.removeItem(STORAGE_KEY_USER);
    } catch {
      // ignore
    }
  }

  hasToken(): boolean {
    return this.getToken() !== null;
  }

  /** Verifica presença do token e se o JWT ainda não expirou (sem validar assinatura). */
  isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    return !isJwtExpired(token);
  }
}