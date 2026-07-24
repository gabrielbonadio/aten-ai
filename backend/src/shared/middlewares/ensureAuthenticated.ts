import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { verifyAccessToken } from '../utils/jwt';
import { ACCESS_COOKIE } from '../../modules/auth/utils/authCookies';

const BEARER_PREFIX = 'Bearer ';

function extractAccessToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith(BEARER_PREFIX)) {
    const token = header.slice(BEARER_PREFIX.length).trim();
    if (token) return token;
  }

  const fromCookie = req.cookies?.[ACCESS_COOKIE];
  if (typeof fromCookie === 'string' && fromCookie.trim()) {
    return fromCookie.trim();
  }

  return null;
}

/**
 * Autenticação multi-tenant: JWT via `Authorization: Bearer` **ou** cookie httpOnly `aten_access`.
 */
export function ensureAuthenticated(req: Request, _res: Response, next: NextFunction): void {
  const token = extractAccessToken(req);

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
