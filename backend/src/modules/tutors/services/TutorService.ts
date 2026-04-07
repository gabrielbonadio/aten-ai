import { Op } from 'sequelize';
import { NotFoundError } from '../../../shared/errors/AppError';
import Pet from '../../pets/models/Pet';
import Tutor from '../models/Tutor';

export type CreateTutorInput = {
  name: string;
  email?: string | null;
  phone: string;
};

export type UpdateTutorInput = Partial<CreateTutorInput>;

class TutorService {
  async create(data: CreateTutorInput, tenantId: number): Promise<Tutor> {
    return Tutor.create({
      tenantId,
      name: data.name.trim(),
      email: data.email?.trim() || null,
      phone: data.phone.trim()
    });
  }

  async findAll(tenantId: number): Promise<Tutor[]> {
    return Tutor.findAll({
      where: { tenantId },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Pet,
          as: 'pets',
          required: false,
          where: { tenantId }
        }
      ]
    });
  }

  async findById(id: string, tenantId: number): Promise<Tutor> {
    const tutor = await Tutor.findOne({
      where: { [Op.and]: [{ id }, { tenantId }] },
      include: [
        {
          model: Pet,
          as: 'pets',
          required: false,
          where: { tenantId }
        }
      ]
    });
    if (!tutor) throw new NotFoundError('Tutor não encontrado.');
    return tutor;
  }

  async update(id: string, data: UpdateTutorInput, tenantId: number): Promise<Tutor> {
    const tutor = await Tutor.findOne({ where: { [Op.and]: [{ id }, { tenantId }] } });
    if (!tutor) throw new NotFoundError('Tutor não encontrado.');

    await tutor.update({
      name: data.name !== undefined ? data.name.trim() : tutor.name,
      email: data.email !== undefined ? (data.email?.trim() || null) : tutor.email,
      phone: data.phone !== undefined ? data.phone.trim() : tutor.phone
    });

    return tutor;
  }

  async delete(id: string, tenantId: number): Promise<void> {
    const removed = await Tutor.destroy({ where: { [Op.and]: [{ id }, { tenantId }] } });
    if (removed === 0) throw new NotFoundError('Tutor não encontrado.');
  }
}

export default new TutorService();

