import { Request, Response } from 'express';
import { AppError } from '../../../shared/errors/AppError';
import tutorService from '../services/TutorService';

function resolveTenantId(req: Request): number {
  const raw = req.user?.tenantId;
  if (raw === undefined) throw new AppError('Não autenticado.', 401);
  const tenantId = Number(raw);
  if (!Number.isFinite(tenantId)) throw new AppError('Identificador do tenant inválido.', 400);
  return tenantId;
}

class TutorController {
  async index(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const tutors = await tutorService.findAll(tenantId);
    res.status(200).json(tutors);
  }

  async store(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const { name, email, phone } = req.body as { name: string; email?: string | null; phone: string };
    const tutor = await tutorService.create({ name, email, phone }, tenantId);
    res.status(201).json(tutor);
  }

  async show(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) throw new AppError('Identificador do tutor inválido.', 400);
    const tutor = await tutorService.findById(id, tenantId);
    res.status(200).json(tutor);
  }

  async update(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) throw new AppError('Identificador do tutor inválido.', 400);
    const tutor = await tutorService.update(id, req.body, tenantId);
    res.status(200).json(tutor);
  }

  async destroy(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) throw new AppError('Identificador do tutor inválido.', 400);
    await tutorService.delete(id, tenantId);
    res.status(204).send();
  }
}

export default new TutorController();

