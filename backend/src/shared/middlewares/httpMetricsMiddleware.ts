import type { NextFunction, Request, Response } from 'express';
import { metrics } from '../observability/metrics';

/** Conta status HTTP ao final de cada resposta (exclui /metrics para evitar ruído). */
export function httpMetricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/metrics') {
    next();
    return;
  }

  res.on('finish', () => {
    metrics.recordHttpStatus(res.statusCode);
  });

  next();
}
