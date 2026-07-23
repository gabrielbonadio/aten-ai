import { Request, Response } from 'express';
import { AppError } from '../../../shared/errors/AppError';
import { buildPaginatedResult, parsePagination } from '../../../shared/utils/pagination';
import petService from '../services/PetService';

function resolveTenantId(req: Request): number {
  const raw = req.user?.tenantId;
  if (raw === undefined) throw new AppError('Não autenticado.', 401);
  const tenantId = Number(raw);
  if (!Number.isFinite(tenantId)) throw new AppError('Identificador do tenant inválido.', 400);
  return tenantId;
}

class PetController {
  async index(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const { page, pageSize, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const { rows, count } = await petService.findAll(tenantId, { limit, offset });
    res.status(200).json(buildPaginatedResult(rows, count, page, pageSize));
  }

  async store(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const { tutorId, name, species, breed, birthDate, weight } = req.body as {
      tutorId: string;
      name: string;
      species?: string | null;
      breed?: string | null;
      birthDate?: string | Date | null;
      weight?: number | null;
    };

    const pet = await petService.create(
      {
        tutorId,
        name,
        species,
        breed,
        birthDate: birthDate ? new Date(birthDate) : null,
        weight: weight ?? null
      },
      tenantId
    );
    res.status(201).json(pet);
  }

  async show(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) throw new AppError('Identificador do pet inválido.', 400);
    const pet = await petService.findById(id, tenantId);
    res.status(200).json(pet);
  }

  async update(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) throw new AppError('Identificador do pet inválido.', 400);

    const body = req.body as {
      tutorId?: string;
      name?: string;
      species?: string | null;
      breed?: string | null;
      birthDate?: string | Date | null;
      weight?: number | null;
    };

    const pet = await petService.update(
      id,
      {
        ...body,
        birthDate: body.birthDate === undefined ? undefined : body.birthDate ? new Date(body.birthDate) : null
      },
      tenantId
    );
    res.status(200).json(pet);
  }

  async destroy(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) throw new AppError('Identificador do pet inválido.', 400);
    await petService.delete(id, tenantId);
    res.status(204).send();
  }
}

export default new PetController();

