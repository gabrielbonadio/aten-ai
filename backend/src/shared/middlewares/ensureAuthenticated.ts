import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { verifyAccessToken } from '../utils/jwt';

const BEARER_PREFIX = 'Bearer ';

/**
 * Middleware multi-tenant: lê JWT no header `Authorization: Bearer <token>`,
 * valida assinatura e expiração com jsonwebtoken (via verifyAccessToken),
 * e injeta `req.user` com { id, tenantId, role }.
 */
export function ensureAuthenticated(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith(BEARER_PREFIX)) {
    next(new AppError('Token não informado.', 401));
    return;
  }

  const token = header.slice(BEARER_PREFIX.length).trim();
  if (!token) {
    next(new AppError('Token não informado.', 401));
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.id,
      tenantId: payload.tenantId,
      role: payload.role
    };

    next();
  } catch {
    next(new AppError('Token inválido ou expirado.', 401));
  }
}
