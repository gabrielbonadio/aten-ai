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
  /** GET /tutors — lista com filtro opcional ?search= (nome ou e-mail). */
  async findAll(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const search =
      typeof req.query.search === 'string'
        ? req.query.search
        : typeof req.query.q === 'string'
          ? req.query.q
          : undefined;
    const tutors = await tutorService.findAll(tenantId, { search });
    res.status(200).json(tutors);
  }

  /** GET /tutors/:id — detalhe com pets. */
  async findOne(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) throw new AppError('Identificador do tutor inválido.', 400);
    const tutor = await tutorService.findOne(id, tenantId);
    res.status(200).json(tutor);
  }

  /** POST /tutors */
  async create(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const { name, email, phone, address } = req.body as {
      name: string;
      email?: string | null;
      phone: string;
      address?: string | null;
    };
    const tutor = await tutorService.create({ name, email, phone, address }, tenantId);
    res.status(201).json(tutor);
  }

  /** PUT /tutors/:id */
  async update(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) throw new AppError('Identificador do tutor inválido.', 400);
    const tutor = await tutorService.update(id, req.body, tenantId);
    res.status(200).json(tutor);
  }

  /** DELETE /tutors/:id */
  async remove(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) throw new AppError('Identificador do tutor inválido.', 400);
    await tutorService.remove(id, tenantId);
    res.status(204).send();
  }
}

export default new TutorController();
