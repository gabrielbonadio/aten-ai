import { Request, Response } from 'express';
import tenantService from '../services/TenantService';

class TenantController {
  async index(_req: Request, res: Response): Promise<void> {
    const tenants = await tenantService.listTenants();
    res.status(200).json(tenants);
  }

  async store(req: Request, res: Response): Promise<void> {
    const { name, slug, plan } = req.body as { name: string; slug: string; plan: 'free' | 'pro' };

    const tenant = await tenantService.createTenant({ name, slug, plan });
    
    res.status(201).json(tenant);
  }
}

export default new TenantController();
