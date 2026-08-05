import { Request, Response } from 'express';
import { AppError } from '../../../shared/errors/AppError';
import type { UserRole } from '../../auth/models/User';
import userService from '../services/UserService';

function resolveTenantId(req: Request): number {
  const raw = req.user?.tenantId;
  if (raw === undefined) throw new AppError('Não autenticado.', 401);
  const tenantId = Number(raw);
  if (!Number.isFinite(tenantId)) throw new AppError('Identificador do tenant inválido.', 400);
  return tenantId;
}

function resolveUserIdParam(req: Request): string {
  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!id) throw new AppError('Identificador do usuário inválido.', 400);
  return id;
}

class UserController {
  async invite(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const { email, role } = req.body as { email: string; role?: UserRole };
    const user = await userService.invite({ email, role }, tenantId);
    res.status(201).json(user);
  }

  async index(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const users = await userService.listByTenant(tenantId);
    res.status(200).json(users);
  }

  async update(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const id = resolveUserIdParam(req);
    const { role, active } = req.body as { role?: UserRole; active?: boolean };
    const user = await userService.update(id, tenantId, { role, active });
    res.status(200).json(user);
  }
}

export default new UserController();
