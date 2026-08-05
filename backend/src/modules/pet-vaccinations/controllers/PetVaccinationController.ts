import { Request, Response } from 'express';
import { AppError } from '../../../shared/errors/AppError';
import { buildPaginatedResult, parsePagination } from '../../../shared/utils/pagination';
import petVaccinationService from '../services/PetVaccinationService';

function resolveTenantId(req: Request): number {
  const raw = req.user?.tenantId;
  if (raw === undefined) throw new AppError('Não autenticado.', 401);
  const tenantId = Number(raw);
  if (!Number.isFinite(tenantId)) throw new AppError('Identificador do tenant inválido.', 400);
  return tenantId;
}

function resolveIdParam(req: Request): string {
  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!id) throw new AppError('Identificador da vacinação inválido.', 400);
  return id;
}

function resolvePetIdParam(req: Request): string {
  const id = typeof req.params.petId === 'string' ? req.params.petId : req.params.petId?.[0];
  if (!id) throw new AppError('Identificador do pet inválido.', 400);
  return id;
}

class PetVaccinationController {
  async store(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const { petId, name, appliedAt, nextDueAt } = req.body as {
      petId: string;
      name: string;
      appliedAt?: string | Date | null;
      nextDueAt?: string | Date | null;
    };

    const row = await petVaccinationService.create(
      {
        petId,
        name,
        appliedAt: appliedAt ? new Date(appliedAt) : null,
        nextDueAt: nextDueAt ? new Date(nextDueAt) : null
      },
      tenantId
    );

    res.status(201).json(row);
  }

  /** POST /pets/:petId/vaccinations — petId vem do path (portal). */
  async storeForPet(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const petId = resolvePetIdParam(req);
    const { name, appliedAt, nextDueAt } = req.body as {
      name: string;
      appliedAt: string | Date;
      nextDueAt?: string | Date | null;
    };

    const row = await petVaccinationService.create(
      {
        petId,
        name,
        appliedAt: new Date(appliedAt),
        nextDueAt: nextDueAt ? new Date(nextDueAt) : null
      },
      tenantId
    );

    res.status(201).json(row);
  }

  async index(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const petId = typeof req.query.petId === 'string' ? req.query.petId : undefined;
    const { page, pageSize, limit, offset } = parsePagination(req.query as Record<string, unknown>);

    const { rows, count } = await petVaccinationService.findAll(
      tenantId,
      { petId },
      { limit, offset }
    );

    res.status(200).json(buildPaginatedResult(rows, count, page, pageSize));
  }

  /** GET /pets/:petId/vaccinations */
  async indexByPet(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const petId = resolvePetIdParam(req);
    const { page, pageSize, limit, offset } = parsePagination(req.query as Record<string, unknown>);

    const { rows, count } = await petVaccinationService.findAll(
      tenantId,
      { petId },
      { limit, offset }
    );

    res.status(200).json(buildPaginatedResult(rows, count, page, pageSize));
  }

  async show(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const row = await petVaccinationService.findById(resolveIdParam(req), tenantId);
    res.status(200).json(row);
  }

  async update(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const { name, appliedAt, nextDueAt } = req.body as {
      name?: string;
      appliedAt?: string | Date | null;
      nextDueAt?: string | Date;
    };

    const row = await petVaccinationService.update(resolveIdParam(req), tenantId, {
      name,
      appliedAt:
        appliedAt === undefined ? undefined : appliedAt === null ? null : new Date(appliedAt),
      nextDueAt: nextDueAt ? new Date(nextDueAt) : undefined
    });

    res.status(200).json(row);
  }

  async destroy(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    await petVaccinationService.remove(resolveIdParam(req), tenantId);
    res.status(204).send();
  }
}

export default new PetVaccinationController();
