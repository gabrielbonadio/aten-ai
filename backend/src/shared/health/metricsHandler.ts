import type { Request, Response } from 'express';
import { metrics } from '../observability/metrics';

/**
 * Snapshot JSON de métricas operacionais (HTTP + última execução dos jobs).
 * Público por padrão — restrinja na borda (nginx/IP allowlist) se necessário.
 */
export function metricsHandler(_req: Request, res: Response): void {
  res.status(200).json(metrics.snapshot());
}
