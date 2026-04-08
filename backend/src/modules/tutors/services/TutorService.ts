import { Op, Sequelize } from 'sequelize';
import { ConflictError, NotFoundError } from '../../../shared/errors/AppError';
import sequelize from '../../../config/database';
import Pet from '../../pets/models/Pet';
import Tutor from '../models/Tutor';

export type CreateTutorInput = {
  name: string;
  email?: string | null;
  phone: string;
  address?: string | null;
};

export type UpdateTutorInput = Partial<CreateTutorInput>;

function normalizeEmail(email: string | null | undefined): string | null {
  if (email === undefined || email === null) return null;
  const t = String(email).trim();
  if (!t) return null;
  return t.toLowerCase();
}

class TutorService {
  /**
   * Garante que não exista outro tutor no mesmo tenant com o mesmo e-mail (case-insensitive).
   * E-mails vazios viram `null` e não entram em conflito entre si (MySQL permite múltiplos NULL em UNIQUE).
   */
  private async assertEmailUniqueForTenant(
    tenantId: number,
    email: string | null,
    excludeTutorId?: string
  ): Promise<void> {
    if (!email) return;

    // Condição de e-mail único por tenant (case-insensitive)
    const parts: Array<Record<string, unknown>> = [
      { tenantId },
      sequelize.where(Sequelize.fn('LOWER', Sequelize.col('email')), email) as unknown as Record<
        string,
        unknown
      >
    ];
    if (excludeTutorId) {
      parts.push({ id: { [Op.ne]: excludeTutorId } });
    }

    const existing = await Tutor.findOne({
      where: { [Op.and]: parts } as import('sequelize').WhereOptions<Tutor>
    });
    if (existing) {
      throw new ConflictError('Já existe um tutor com este e-mail nesta clínica.');
    }
  }

  async create(data: CreateTutorInput, tenantId: number): Promise<Tutor> {
    const emailNorm = normalizeEmail(data.email ?? null);
    await this.assertEmailUniqueForTenant(tenantId, emailNorm);

    return Tutor.create({
      tenantId,
      name: data.name.trim(),
      email: emailNorm,
      phone: data.phone.trim(),
      address: data.address?.trim() ? data.address.trim() : null
    });
  }

  async findAll(tenantId: number, options?: { search?: string }): Promise<Tutor[]> {
    const search = options?.search?.trim();
    const where: import('sequelize').WhereOptions<Tutor> = { tenantId };

    if (search) {
      const q = `%${search}%`;
      (where as Record<PropertyKey, unknown>)[Op.or] = [
        { name: { [Op.like]: q } },
        { email: { [Op.like]: q } }
      ];
    }

    return Tutor.findAll({
      where,
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

  /** Alias semântico (findOne por id + tenant). Inclui pets do tutor (escopo tenant). */
  async findOne(id: string, tenantId: number): Promise<Tutor> {
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

    const nextEmail =
      data.email !== undefined ? normalizeEmail(data.email) : normalizeEmail(tutor.email);
    if (data.email !== undefined) {
      await this.assertEmailUniqueForTenant(tenantId, nextEmail, id);
    }

    await tutor.update({
      name: data.name !== undefined ? data.name.trim() : tutor.name,
      email: data.email !== undefined ? nextEmail : tutor.email,
      phone: data.phone !== undefined ? data.phone.trim() : tutor.phone,
      address:
        data.address !== undefined
          ? data.address?.trim()
            ? data.address.trim()
            : null
          : tutor.address
    });

    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: number): Promise<void> {
    const removed = await Tutor.destroy({ where: { [Op.and]: [{ id }, { tenantId }] } });
    if (removed === 0) throw new NotFoundError('Tutor não encontrado.');
  }
}

export default new TutorService();
