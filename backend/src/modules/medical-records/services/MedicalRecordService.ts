import { Op } from 'sequelize';
import { AppError, NotFoundError } from '../../../shared/errors/AppError';
import Appointment from '../../appointments/models/Appointment';
import Pet from '../../pets/models/Pet';
import User from '../../auth/models/User';
import MedicalRecord from '../models/MedicalRecord';

export type CreateMedicalRecordInput = {
  petId: string;
  appointmentId?: string | null;
  symptoms: string;
  diagnosis: string;
  prescription?: string | null;
  weight?: number | null;
};

export type UpdateMedicalRecordInput = Partial<Omit<CreateMedicalRecordInput, 'petId'>>;

class MedicalRecordService {
  async create(data: CreateMedicalRecordInput, tenantId: number, veterinarianId: string): Promise<MedicalRecord> {
    const pet = await Pet.findOne({ where: { [Op.and]: [{ id: data.petId }, { tenantId }] } });
    if (!pet) throw new NotFoundError('Pet não encontrado.');

    if (data.appointmentId) {
      const appointment = await Appointment.findOne({
        where: { [Op.and]: [{ id: data.appointmentId }, { tenantId }] }
      });
      if (!appointment) throw new NotFoundError('Agendamento não encontrado.');
      if (appointment.petId !== data.petId) {
        throw new AppError('Agendamento não pertence ao pet informado.', 400);
      }
    }

    return MedicalRecord.create({
      tenantId,
      petId: data.petId,
      appointmentId: data.appointmentId ?? null,
      veterinarianId,
      symptoms: data.symptoms.trim(),
      diagnosis: data.diagnosis.trim(),
      prescription: data.prescription?.trim() || null,
      weight: data.weight ?? null
    });
  }

  async findAll(tenantId: number): Promise<MedicalRecord[]> {
    return MedicalRecord.findAll({
      where: { tenantId },
      order: [['createdAt', 'DESC']]
    });
  }

  async findById(id: string, tenantId: number): Promise<MedicalRecord> {
    const record = await MedicalRecord.findOne({ where: { [Op.and]: [{ id }, { tenantId }] } });
    if (!record) throw new NotFoundError('Prontuário não encontrado.');
    return record;
  }

  async update(id: string, tenantId: number, data: UpdateMedicalRecordInput): Promise<MedicalRecord> {
    const record = await MedicalRecord.findOne({ where: { [Op.and]: [{ id }, { tenantId }] } });
    if (!record) throw new NotFoundError('Prontuário não encontrado.');

    if (data.appointmentId !== undefined && data.appointmentId) {
      const appointment = await Appointment.findOne({
        where: { [Op.and]: [{ id: data.appointmentId }, { tenantId }] }
      });
      if (!appointment) throw new NotFoundError('Agendamento não encontrado.');
      if (appointment.petId !== record.petId) {
        throw new AppError('Agendamento não pertence ao pet deste prontuário.', 400);
      }
    }

    await record.update({
      appointmentId: data.appointmentId !== undefined ? (data.appointmentId ?? null) : record.appointmentId,
      symptoms: data.symptoms !== undefined ? data.symptoms.trim() : record.symptoms,
      diagnosis: data.diagnosis !== undefined ? data.diagnosis.trim() : record.diagnosis,
      prescription: data.prescription !== undefined ? (data.prescription?.trim() || null) : record.prescription,
      weight: data.weight !== undefined ? (data.weight ?? null) : record.weight
    });

    return record;
  }

  async delete(id: string, tenantId: number): Promise<void> {
    const removed = await MedicalRecord.destroy({ where: { [Op.and]: [{ id }, { tenantId }] } });
    if (removed === 0) throw new NotFoundError('Prontuário não encontrado.');
  }

  async findByPetId(petId: string, tenantId: number): Promise<MedicalRecord[]> {
    const pet = await Pet.findOne({ where: { [Op.and]: [{ id: petId }, { tenantId }] } });
    if (!pet) throw new NotFoundError('Pet não encontrado.');

    return MedicalRecord.findAll({
      where: { [Op.and]: [{ tenantId }, { petId }] },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'veterinarian',
          required: true,
          attributes: ['id', 'name', 'email', 'role', 'tenantId'],
          where: { tenantId }
        }
      ]
    });
  }
}

export default new MedicalRecordService();

