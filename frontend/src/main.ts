import { bootstrapApplication } from '@angular/platform-browser';
import * as Sentry from '@sentry/browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

const sentryDsn = environment.sentryDsn?.trim();
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: environment.production ? 'production' : 'development',
    tracesSampleRate: environment.production ? 0.1 : 0
  });
}

bootstrapApplication(AppComponent, appConfig).catch((err) => {
  if (sentryDsn) {
    Sentry.captureException(err);
  }
  console.error(err);
});
