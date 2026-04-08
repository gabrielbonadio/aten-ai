import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { ApplicationConfig } from '@angular/core';

import { provideRouter } from '@angular/router';

import { authInterceptor } from './core/interceptors/auth.interceptor';

import { lucideAppIconsProviders } from './core/providers/lucide-app-icons.provider';



import { routes } from './app.routes';



/** NotificationService / Toast: `providedIn: 'root'` — não exige entrada extra aqui. */
export const appConfig: ApplicationConfig = {

  providers: [

    provideHttpClient(withInterceptors([authInterceptor])),

    provideRouter(routes),

    lucideAppIconsProviders

  ]

};

