import { Request, Response } from 'express';
import { AppError } from '../../../shared/errors/AppError';
import customerService from '../services/CustomerService';

function resolveTenantId(req: Request): number {
  const raw = req.user?.tenantId;
  if (raw === undefined) {
    throw new AppError('Não autenticado.', 401);
  }
  const tenantId = Number(raw);
  if (!Number.isFinite(tenantId)) {
    throw new AppError('Identificador do tenant inválido.', 400);
  }
  return tenantId;
}

class CustomerController {
  async index(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const customers = await customerService.findAll(tenantId);
    res.status(200).json(customers);
  }

  async store(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const { name, email, phone } = req.body as {
      name: string;
      email: string;
      phone?: string | null;
    };

    const customer = await customerService.create({ name, email, phone }, tenantId);
    res.status(201).json(customer);
  }

  async destroy(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) {
      throw new AppError('Identificador do cliente inválido.', 400);
    }

    await customerService.deleteById(id, tenantId);
    res.status(204).send();
  }
}

export default new CustomerController();
