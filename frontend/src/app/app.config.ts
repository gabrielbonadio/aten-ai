import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { lucideAppIconsProviders } from './core/providers/lucide-app-icons.provider';
import { AuthService } from './core/services/auth.service';
import { routes } from './app.routes';

function authHydrateInitializer(auth: AuthService): () => Promise<boolean> {
  return () => firstValueFrom(auth.hydrateSession());
}

/** NotificationService / Toast: `providedIn: 'root'` — não exige entrada extra aqui. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: authHydrateInitializer,
      deps: [AuthService],
      multi: true
    },
    provideRouter(routes),
    lucideAppIconsProviders
  ]
};
