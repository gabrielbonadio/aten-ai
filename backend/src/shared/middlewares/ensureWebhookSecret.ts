import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../errors/AppError';

const BEARER_PREFIX = 'Bearer ';

function readConfiguredSecret(): string | null {
  const secret = process.env.N8N_WEBHOOK_SECRET?.trim();
  return secret ? secret : null;
}

function safeEqualToken(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);

  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

/**
 * Valida chamadas inbound de integrações (ex.: n8n) via shared secret.
 * Header esperado: `Authorization: Bearer <N8N_WEBHOOK_SECRET>`.
 */
export function ensureWebhookSecret(req: Request, _res: Response, next: NextFunction): void {
  const configuredSecret = readConfiguredSecret();
  if (!configuredSecret) {
    next(new UnauthorizedError('Webhook secret não configurado no servidor.'));
    return;
  }

  const header = req.headers.authorization;
  if (!header || !header.startsWith(BEARER_PREFIX)) {
    next(new UnauthorizedError('Token de webhook não informado.'));
    return;
  }

  const providedSecret = header.slice(BEARER_PREFIX.length).trim();
  if (!providedSecret) {
    next(new UnauthorizedError('Token de webhook não informado.'));
    return;
  }

  if (!safeEqualToken(providedSecret, configuredSecret)) {
    next(new UnauthorizedError('Token de webhook inválido.'));
    return;
  }

  next();
}
