import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

/**
 * Autorização RBAC: restringe a rota a um conjunto de papéis (`req.user.role`).
 * Deve ser usado sempre **depois** de `ensureAuthenticated`.
 */
export function ensureRole(allowedRoles: string[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Não autenticado.', 401));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError('Você não tem permissão para realizar esta ação.', 403));
      return;
    }

    next();
  };
}
