import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isTokenValid()) {
    if (authService.hasToken()) {
      authService.logout();
    }
    return router.createUrlTree(['/login']);
  }

  return true;
};

