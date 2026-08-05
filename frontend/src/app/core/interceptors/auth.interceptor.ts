import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  filter,
  switchMap,
  take,
  throwError
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../shared/notifications/notification.service';
import { AuthService } from '../services/auth.service';
import { ClinicBrandingService } from '../services/clinic-branding.service';

let isRefreshing = false;
const refreshDone$ = new BehaviorSubject<boolean>(false);

/** Reseta estado compartilhado do interceptor (apenas para testes). */
export function resetAuthInterceptorState(): void {
  isRefreshing = false;
  refreshDone$.next(false);
}

function isAuthPublicUrl(url: string, apiBase: string): boolean {
  return (
    url.startsWith(`${apiBase}/auth/login`) ||
    url.startsWith(`${apiBase}/auth/signup`) ||
    url.startsWith(`${apiBase}/auth/forgot-password`) ||
    url.startsWith(`${apiBase}/auth/reset-password`) ||
    url.startsWith(`${apiBase}/auth/accept-invite`) ||
    url.startsWith(`${apiBase}/auth/refresh`) ||
    url.startsWith(`${apiBase}/auth/logout`)
  );
}

function forceSessionExpired(
  auth: AuthService,
  branding: ClinicBrandingService,
  router: Router
): void {
  branding.reset();
  auth.logout({ reason: 'session_expired' });
  void router.navigateByUrl('/login');
}

/**
 * Envia cookies (`withCredentials`) e Bearer opcional (memória).
 * Em 401, tenta `/auth/refresh` via cookie httpOnly antes de forçar logout.
 * Em 403, toast curto "Sem permissão".
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const branding = inject(ClinicBrandingService);
  const notifications = inject(NotificationService);
  const router = inject(Router);
  const token = auth.getToken();

  const base = environment.apiUrl.replace(/\/$/, '');
  const isApi = req.url.startsWith(base);
  const isAuthPublic = isAuthPublicUrl(req.url, base);

  let reqToSend = req;
  if (isApi) {
    const headers: Record<string, string> = {};
    if (token && !isAuthPublic) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    reqToSend = req.clone({
      withCredentials: true,
      setHeaders: headers
    });
  }

  return next(reqToSend).pipe(
    catchError((err: unknown) => {
      if (isApi && !isAuthPublic && err instanceof HttpErrorResponse && err.status === 403) {
        notifications.error('Sem permissão');
        return throwError(() => err);
      }

      if (!(isApi && !isAuthPublic && err instanceof HttpErrorResponse && err.status === 401)) {
        return throwError(() => err);
      }

      if (!isRefreshing) {
        isRefreshing = true;
        refreshDone$.next(false);

        return auth.refresh().pipe(
          switchMap(() => {
            isRefreshing = false;
            refreshDone$.next(true);
            const newToken = auth.getToken();
            const retryReq = req.clone({
              withCredentials: true,
              setHeaders: newToken ? { Authorization: `Bearer ${newToken}` } : {}
            });
            return next(retryReq);
          }),
          catchError((refreshErr: unknown) => {
            isRefreshing = false;
            refreshDone$.next(false);
            forceSessionExpired(auth, branding, router);
            return throwError(() => refreshErr);
          })
        );
      }

      return refreshDone$.pipe(
        filter((done) => done === true),
        take(1),
        switchMap(() => {
          const newToken = auth.getToken();
          const retryReq = req.clone({
            withCredentials: true,
            setHeaders: newToken ? { Authorization: `Bearer ${newToken}` } : {}
          });
          return next(retryReq);
        })
      );
    })
  );
};
