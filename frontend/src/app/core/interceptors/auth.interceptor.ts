import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';

/**
 * Adiciona `Authorization: Bearer <token>` nas requisições ao backend configurado em `environment.apiUrl`.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();

  const base = environment.apiUrl.replace(/\/$/, '');
  const isApi = req.url.startsWith(base);
  const isAuthPublic =
    req.url.startsWith(`${base}/auth/login`) ||
    req.url.startsWith(`${base}/auth/signup`) ||
    req.url.startsWith(`${base}/auth/forgot-password`) ||
    req.url.startsWith(`${base}/auth/reset-password`);

  const reqWithAuth =
    token && isApi
      ? req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        })
      : req;

  return next(reqWithAuth).pipe(
    catchError((err: unknown) => {
      if (isApi && !isAuthPublic && err instanceof HttpErrorResponse && err.status === 401) {
        auth.logout();
        void router.navigateByUrl('/login');
      }
      return throwError(() => err);
    })
  );
};
