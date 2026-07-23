import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/** Impede acesso a rotas públicas de auth quando já há sessão válida. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isTokenValid()) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
