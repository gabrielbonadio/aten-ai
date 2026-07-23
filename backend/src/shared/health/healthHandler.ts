import type { Request, Response } from 'express';
import sequelize from '../../config/database';
import { logger } from '../logging/logger';

export type HealthStatus = 'ok' | 'degraded';

export type HealthResponse = {
  status: HealthStatus;
  service: string;
  uptimeSec: number;
  checks: {
    database: {
      status: 'up' | 'down';
      latencyMs: number | null;
      error?: string;
    };
  };
};

/**
 * Health check com verificação real do MySQL.
 * - 200: banco acessível
 * - 503: API no ar, mas banco indisponível (útil para orquestradores / load balancers)
 * Detalhes do driver MySQL nunca vão na resposta pública.
 */
export async function healthHandler(_req: Request, res: Response): Promise<void> {
  const started = Date.now();
  let dbStatus: 'up' | 'down' = 'down';
  let latencyMs: number | null = null;
  let dbError: string | undefined;

  try {
    await sequelize.authenticate();
    latencyMs = Date.now() - started;
    dbStatus = 'up';
  } catch (err) {
    latencyMs = Date.now() - started;
    dbError = 'database_unreachable';
    logger.error('health.database_down', {
      error: err instanceof Error ? err.message : String(err),
      latencyMs
    });
  }

  const payload: HealthResponse = {
    status: dbStatus === 'up' ? 'ok' : 'degraded',
    service: 'aten-ai-backend',
    uptimeSec: Math.floor(process.uptime()),
    checks: {
      database: {
        status: dbStatus,
        latencyMs,
        ...(dbError ? { error: dbError } : {})
      }
    }
  };

  res.status(dbStatus === 'up' ? 200 : 503).json(payload);
}
