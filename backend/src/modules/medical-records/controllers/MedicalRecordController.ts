import { Request, Response } from 'express';
import { AppError } from '../../../shared/errors/AppError';
import medicalRecordService from '../services/MedicalRecordService';

function resolveTenantId(req: Request): number {
  const raw = req.user?.tenantId;
  if (raw === undefined) throw new AppError('Não autenticado.', 401);
  const tenantId = Number(raw);
  if (!Number.isFinite(tenantId)) throw new AppError('Identificador do tenant inválido.', 400);
  return tenantId;
}

function resolveUserId(req: Request): string {
  const id = req.user?.id;
  if (!id) throw new AppError('Não autenticado.', 401);
  return id;
}

class MedicalRecordController {
  async index(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const records = await medicalRecordService.findAll(tenantId);
    res.status(200).json(records);
  }

  async store(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const veterinarianId = resolveUserId(req);
    const record = await medicalRecordService.create(req.body, tenantId, veterinarianId);
    res.status(201).json(record);
  }

  async show(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) throw new AppError('Identificador do prontuário inválido.', 400);
    const record = await medicalRecordService.findById(id, tenantId);
    res.status(200).json(record);
  }

  async update(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) throw new AppError('Identificador do prontuário inválido.', 400);
    const record = await medicalRecordService.update(id, tenantId, req.body);
    res.status(200).json(record);
  }

  async destroy(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) throw new AppError('Identificador do prontuário inválido.', 400);
    await medicalRecordService.delete(id, tenantId);
    res.status(204).send();
  }

  async byPet(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const petId = typeof req.params.petId === 'string' ? req.params.petId : req.params.petId?.[0];
    if (!petId) throw new AppError('Identificador do pet inválido.', 400);
    const records = await medicalRecordService.findByPetId(petId, tenantId);
    res.status(200).json(records);
  }
}

export default new MedicalRecordController();

