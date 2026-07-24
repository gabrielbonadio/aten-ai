import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { isJwtExpired } from '../utils/jwt.util';
import { setAuthNotice, type LogoutReason } from '../utils/auth-notice.util';

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
  refreshToken: string;
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

const STORAGE_KEY_USER = 'user_data';
const STORAGE_KEY_SESSION = 'aten-ai.session';
/** Chaves legadas — limpas no login para sair do modelo localStorage de JWT. */
const LEGACY_TOKEN_KEYS = ['token', 'aten-ai.access_token', 'aten-ai.refresh_token'] as const;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  /** Access JWT só em memória (cookie httpOnly é a fonte da verdade após F5). */
  private accessTokenMemory: string | null = null;

  private loggedIn = new BehaviorSubject<boolean>(this.hasSessionFlag());
  isLoggedIn$ = this.loggedIn.asObservable();

  private apiBase(): string {
    return environment.apiUrl.replace(/\/$/, '');
  }

  private httpOpts() {
    return { withCredentials: true as const };
  }

  private persistSession(response: AuthResponse): void {
    this.accessTokenMemory = response.token.trim();
    this.setUserData(response.user);
    this.setSessionFlag(true);
    this.clearLegacyTokenStorage();
    this.loggedIn.next(true);
  }

  private clearLocalSession(): void {
    this.accessTokenMemory = null;
    this.clearLegacyTokenStorage();
    try {
      localStorage.removeItem(STORAGE_KEY_USER);
      sessionStorage.removeItem(STORAGE_KEY_SESSION);
    } catch {
      // ignore
    }
    this.loggedIn.next(false);
  }

  private setSessionFlag(active: boolean): void {
    try {
      if (active) {
        sessionStorage.setItem(STORAGE_KEY_SESSION, '1');
      } else {
        sessionStorage.removeItem(STORAGE_KEY_SESSION);
      }
    } catch {
      // ignore
    }
  }

  private hasSessionFlag(): boolean {
    try {
      return sessionStorage.getItem(STORAGE_KEY_SESSION) === '1';
    } catch {
      return false;
    }
  }

  private clearLegacyTokenStorage(): void {
    try {
      for (const key of LEGACY_TOKEN_KEYS) {
        localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
  }

  /** Cadastro multi-tenant: cria clínica + admin e salva a sessão. */
  signUp(payload: SignUpPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiBase()}/auth/signup`, payload, this.httpOpts())
      .pipe(tap((response) => this.persistSession(response)));
  }

  /** Realiza o login e salva os dados na sessão. */
  login(credentials: LoginPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiBase()}/auth/login`, credentials, this.httpOpts())
      .pipe(tap((response) => this.persistSession(response)));
  }

  /**
   * Renova access + refresh (cookies httpOnly + JSON).
   * Body vazio: o refresh vem do cookie quando o front não guarda o token.
   */
  refresh(): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiBase()}/auth/refresh`, {}, this.httpOpts())
      .pipe(tap((response) => this.persistSession(response)));
  }

  /**
   * Restaura sessão após F5: /auth/me via cookie; se 401, tenta refresh.
   * Sem flag de sessão, não chama a API (evita 401 no primeiro acesso ao login).
   */
  hydrateSession(): Observable<boolean> {
    if (!this.hasSessionFlag() && !this.accessTokenMemory) {
      return of(false);
    }

    return this.getMe().pipe(
      tap(() => {
        this.setSessionFlag(true);
        this.loggedIn.next(true);
      }),
      map(() => true),
      catchError(() =>
        this.refresh().pipe(
          switchMap(() => this.getMe()),
          tap(() => {
            this.setSessionFlag(true);
            this.loggedIn.next(true);
          }),
          map(() => true),
          catchError(() => {
            this.clearLocalSession();
            return of(false);
          })
        )
      )
    );
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(
      `${this.apiBase()}/auth/forgot-password`,
      { email },
      this.httpOpts()
    );
  }

  resetPassword(token: string, password: string): Observable<void> {
    return this.http.post<void>(
      `${this.apiBase()}/auth/reset-password`,
      { token, password },
      this.httpOpts()
    );
  }

  /**
   * Desloga: limpa estado local e revoga refresh (cookie / best-effort).
   */
  logout(options?: { reason?: LogoutReason }): void {
    this.clearLocalSession();
    setAuthNotice(options?.reason === 'session_expired' ? 'session_expired' : 'manual');

    this.http.post<void>(`${this.apiBase()}/auth/logout`, {}, this.httpOpts()).subscribe({
      error: () => {
        // Revogação best-effort
      }
    });
  }

  getMe(): Observable<{ user: CurrentUser }> {
    return this.http.get<{ user: CurrentUser }>(`${this.apiBase()}/auth/me`, this.httpOpts()).pipe(
      tap((res) => this.setUserData(res.user))
    );
  }

  /** Access token em memória (Bearer opcional). Cookie httpOnly cobre o auth real. */
  getToken(): string | null {
    return this.accessTokenMemory;
  }

  /** Refresh não fica acessível ao JS (só cookie). Mantido por compat de testes/interceptor. */
  getRefreshToken(): string | null {
    return null;
  }

  setToken(token: string): void {
    this.accessTokenMemory = token.trim();
  }

  setRefreshToken(_refreshToken: string): void {
    // no-op — refresh só no cookie httpOnly
  }

  private setUserData(user: CurrentUser): void {
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } catch {
      // ignore
    }
  }

  clearToken(): void {
    this.clearLocalSession();
  }

  hasToken(): boolean {
    return this.accessTokenMemory !== null || this.hasSessionFlag();
  }

  /**
   * Sessão válida: flag de sessão (cookie) ou JWT em memória ainda não expirado.
   */
  isTokenValid(): boolean {
    if (this.accessTokenMemory && !isJwtExpired(this.accessTokenMemory)) {
      return true;
    }
    return this.hasSessionFlag();
  }
}
