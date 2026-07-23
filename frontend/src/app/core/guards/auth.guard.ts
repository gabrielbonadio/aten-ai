import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ClinicBrandingService } from '../services/clinic-branding.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const branding = inject(ClinicBrandingService);
  const router = inject(Router);

  if (!authService.isTokenValid()) {
    if (authService.hasToken()) {
      branding.reset();
      authService.logout({ reason: 'session_expired' });
    }
    return router.createUrlTree(['/login']);
  }

  return true;
};
