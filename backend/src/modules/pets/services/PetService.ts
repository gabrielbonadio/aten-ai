import { Op } from 'sequelize';
import { NotFoundError } from '../../../shared/errors/AppError';
import User from '../../auth/models/User';
import Appointment from '../../appointments/models/Appointment';
import MedicalRecord from '../../medical-records/models/MedicalRecord';
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

  async findAll(
    tenantId: number,
    pagination: { limit: number; offset: number }
  ): Promise<{ rows: Pet[]; count: number }> {
    return Pet.findAndCountAll({
      where: { tenantId },
      order: [['createdAt', 'DESC']],
      limit: pagination.limit,
      offset: pagination.offset,
      distinct: true,
      include: [
        {
          model: Tutor,
          as: 'tutor',
          required: false,
          attributes: ['id', 'name', 'phone', 'email']
        }
      ]
    });
  }

  async findById(id: string, tenantId: number): Promise<Pet> {
    const pet = await Pet.findOne({
      where: { [Op.and]: [{ id }, { tenantId }] },
      include: [
        {
          model: Tutor,
          as: 'tutor',
          required: false,
          attributes: ['id', 'name', 'phone', 'email']
        },
        {
          model: Appointment,
          as: 'appointments',
          required: false,
          where: { tenantId },
          separate: true,
          order: [['date', 'DESC']]
        },
        {
          model: MedicalRecord,
          as: 'medicalRecords',
          required: false,
          where: { tenantId },
          separate: true,
          order: [['createdAt', 'DESC']],
          include: [
            {
              model: User,
              as: 'veterinarian',
              required: false,
              attributes: ['id', 'name'],
              where: { tenantId }
            }
          ]
        }
      ]
    });
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

