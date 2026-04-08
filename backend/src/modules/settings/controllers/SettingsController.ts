import { Request, Response } from 'express';
import { AppError } from '../../../shared/errors/AppError';
import tenantService from '../../tenants/services/TenantService';

function resolveTenantId(req: Request): number {
  const raw = req.user?.tenantId;
  if (raw === undefined) throw new AppError('Não autenticado.', 401);
  const tenantId = Number(raw);
  if (!Number.isFinite(tenantId)) throw new AppError('Identificador do tenant inválido.', 400);
  return tenantId;
}

/**
 * Configurações da clínica (tenant) do usuário autenticado.
 * Sempre usa `req.user.tenantId` do JWT — nunca confia em body/query/params para o tenant.
 */
class SettingsController {
  async show(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const tenant = await tenantService.getSettingsByTenantId(tenantId);
    res.status(200).json(tenant);
  }

  async update(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const body = req.body as {
      name?: string;
      document?: string | null;
      phone?: string | null;
      address?: string | null;
      email?: string | null;
    };
    const tenant = await tenantService.updateSettingsByTenantId(tenantId, body);
    res.status(200).json(tenant);
  }
}

export default new SettingsController();
