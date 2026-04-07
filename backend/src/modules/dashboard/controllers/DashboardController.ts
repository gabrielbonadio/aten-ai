import { Request, Response } from 'express';
import { AppError } from '../../../shared/errors/AppError';
import dashboardService from '../services/DashboardService';

function resolveTenantId(req: Request): string {
  const tenantId = req.user?.tenantId;
  if (!tenantId) throw new AppError('Não autenticado.', 401);
  return tenantId;
}

class DashboardController {
  async show(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const metrics = await dashboardService.getMetrics(tenantId);
    res.status(200).json(metrics);
  }
}

export default new DashboardController();

