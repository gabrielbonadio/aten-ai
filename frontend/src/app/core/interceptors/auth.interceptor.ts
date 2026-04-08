import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * Adiciona `Authorization: Bearer <token>` nas requisições ao backend configurado em `environment.apiUrl`.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  const base = environment.apiUrl.replace(/\/$/, '');
  const isApi = req.url.startsWith(base);

  if (!token) {
    if (isApi) {
      console.warn('[AuthInterceptor] Requisição ao backend sem token:', req.url);
    }
    return next(req);
  }

  if (!isApi) {
    return next(req);
  }

  console.log('Token enviado:', token);

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
  );
};
