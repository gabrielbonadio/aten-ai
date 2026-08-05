import { Op } from 'sequelize';
import { NotFoundError } from '../../../shared/errors/AppError';
import Pet from '../../pets/models/Pet';
import PetVaccination from '../models/PetVaccination';

export type CreatePetVaccinationInput = {
  petId: string;
  name: string;
  appliedAt?: Date | null;
  /** Se omitido/null, usa appliedAt + 1 ano (ou agora + 1 ano). */
  nextDueAt?: Date | null;
};

export type UpdatePetVaccinationInput = Partial<{
  name: string;
  appliedAt: Date | null;
  nextDueAt: Date;
}>;

export type ListPetVaccinationFilters = {
  petId?: string;
};

class PetVaccinationService {
  async create(data: CreatePetVaccinationInput, tenantId: number): Promise<PetVaccination> {
    const pet = await Pet.findOne({ where: { [Op.and]: [{ id: data.petId }, { tenantId }] } });
    if (!pet) throw new NotFoundError('Pet não encontrado.');

    const appliedAt = data.appliedAt ?? null;
    const nextDueAt =
      data.nextDueAt ??
      new Date((appliedAt ?? new Date()).getTime() + 365 * 24 * 60 * 60 * 1000);

    return PetVaccination.create({
      tenantId,
      petId: data.petId,
      name: data.name.trim(),
      appliedAt,
      nextDueAt,
      reminderSentAt: null
    });
  }

  async findAll(
    tenantId: number,
    filters: ListPetVaccinationFilters,
    pagination: { limit: number; offset: number }
  ): Promise<{ rows: PetVaccination[]; count: number }> {
    const and: Array<Record<string, unknown>> = [{ tenantId }];
    if (filters.petId) and.push({ petId: filters.petId });

    return PetVaccination.findAndCountAll({
      where: { [Op.and]: and },
      order: [['nextDueAt', 'ASC']],
      limit: pagination.limit,
      offset: pagination.offset
    });
  }

  async findById(id: string, tenantId: number): Promise<PetVaccination> {
    const row = await PetVaccination.findOne({ where: { [Op.and]: [{ id }, { tenantId }] } });
    if (!row) throw new NotFoundError('Vacinação não encontrada.');
    return row;
  }

  async update(id: string, tenantId: number, data: UpdatePetVaccinationInput): Promise<PetVaccination> {
    const row = await this.findById(id, tenantId);

    const patch: Partial<{
      name: string;
      appliedAt: Date | null;
      nextDueAt: Date;
      reminderSentAt: Date | null;
    }> = {};

    if (data.name !== undefined) patch.name = data.name.trim();
    if (data.appliedAt !== undefined) patch.appliedAt = data.appliedAt;
    if (data.nextDueAt !== undefined) {
      patch.nextDueAt = data.nextDueAt;
      // Nova data de vencimento → permite novo lembrete D-1.
      if (row.nextDueAt.getTime() !== data.nextDueAt.getTime()) {
        patch.reminderSentAt = null;
      }
    }

    if (Object.keys(patch).length > 0) {
      await row.update(patch);
    }

    return row;
  }

  async remove(id: string, tenantId: number): Promise<void> {
    const removed = await PetVaccination.destroy({ where: { [Op.and]: [{ id }, { tenantId }] } });
    if (removed === 0) throw new NotFoundError('Vacinação não encontrada.');
  }
}

export default new PetVaccinationService();
