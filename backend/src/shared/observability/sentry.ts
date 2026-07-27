import * as Sentry from '@sentry/node';

let enabled = false;

/**
 * Inicializa Sentry quando `SENTRY_DSN` está definido.
 * Chamar o mais cedo possível no boot (server/worker).
 */
export function initSentry(): void {
  const dsn = (process.env.SENTRY_DSN ?? '').trim();
  if (!dsn) {
    return;
  }

  const nodeEnv = (process.env.NODE_ENV ?? 'development').trim().toLowerCase();
  const tracesSampleRateRaw = (process.env.SENTRY_TRACES_SAMPLE_RATE ?? '').trim();
  const tracesSampleRate = tracesSampleRateRaw
    ? Number.parseFloat(tracesSampleRateRaw)
    : nodeEnv === 'production'
      ? 0.1
      : 0;

  Sentry.init({
    dsn,
    environment: nodeEnv,
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0.1,
    beforeSend(event) {
      // Nunca enviar cookies/authorization ao Sentry
      if (event.request?.headers) {
        delete event.request.headers.cookie;
        delete event.request.headers.authorization;
      }
      return event;
    }
  });

  enabled = true;
}

export function isSentryEnabled(): boolean {
  return enabled;
}

export function captureServerException(err: unknown, context?: Record<string, unknown>): void {
  if (!enabled) {
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value);
      }
    }
    Sentry.captureException(err);
  });
}
