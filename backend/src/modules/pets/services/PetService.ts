import { Op } from 'sequelize';
import { NotFoundError } from '../../../shared/errors/AppError';
import Tutor from '../../tutors/models/Tutor';
import Pet from '../models/Pet';

export type CreatePetInput = {
  tutorId: string;
  name: string;
  species?: string | null;
  breed?: string | null;
  birthDate?: Date | null;
  weight?: number | null;
};

export type UpdatePetInput = Partial<CreatePetInput>;

class PetService {
  async create(data: CreatePetInput, tenantId: number): Promise<Pet> {
    // Garante que o tutor pertence ao mesmo tenant (isolamento multi-tenant).
    const tutor = await Tutor.findOne({
      where: { [Op.and]: [{ id: data.tutorId }, { tenantId }] }
    });
    if (!tutor) throw new NotFoundError('Tutor não encontrado.');

    return Pet.create({
      tenantId,
      tutorId: data.tutorId,
      name: data.name.trim(),
      species: data.species?.trim() || null,
      breed: data.breed?.trim() || null,
      birthDate: data.birthDate ?? null,
      weight: data.weight === undefined || data.weight === null ? null : data.weight
    });
  }

  async findAll(tenantId: number): Promise<Pet[]> {
    return Pet.findAll({
      where: { tenantId },
      order: [['createdAt', 'DESC']]
    });
  }

  async findById(id: string, tenantId: number): Promise<Pet> {
    const pet = await Pet.findOne({ where: { [Op.and]: [{ id }, { tenantId }] } });
    if (!pet) throw new NotFoundError('Pet não encontrado.');
    return pet;
  }

  async update(id: string, data: UpdatePetInput, tenantId: number): Promise<Pet> {
    const pet = await Pet.findOne({ where: { [Op.and]: [{ id }, { tenantId }] } });
    if (!pet) throw new NotFoundError('Pet não encontrado.');

    if (data.tutorId !== undefined) {
      const tutor = await Tutor.findOne({
        where: { [Op.and]: [{ id: data.tutorId }, { tenantId }] }
      });
      if (!tutor) throw new NotFoundError('Tutor não encontrado.');
    }

    await pet.update({
      tutorId: data.tutorId !== undefined ? data.tutorId : pet.tutorId,
      name: data.name !== undefined ? data.name.trim() : pet.name,
      species: data.species !== undefined ? (data.species?.trim() || null) : pet.species,
      breed: data.breed !== undefined ? (data.breed?.trim() || null) : pet.breed,
      birthDate: data.birthDate !== undefined ? (data.birthDate ?? null) : pet.birthDate,
      weight:
        data.weight !== undefined
          ? data.weight === null
            ? null
            : data.weight
          : pet.weight
    });

    return pet;
  }

  async delete(id: string, tenantId: number): Promise<void> {
    const removed = await Pet.destroy({ where: { [Op.and]: [{ id }, { tenantId }] } });
    if (removed === 0) throw new NotFoundError('Pet não encontrado.');
  }
}

export default new PetService();

