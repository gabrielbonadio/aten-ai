import { Op } from 'sequelize';
import { NotFoundError } from '../../../shared/errors/AppError';
import type { IWebhookProvider } from '../../../shared/providers/WebhookProvider/IWebhookProvider';
import { N8nWebhookProvider } from '../../../shared/providers/WebhookProvider/N8nWebhookProvider';
import Pet from '../../pets/models/Pet';
import Tutor from '../../tutors/models/Tutor';
import Appointment from '../models/Appointment';
import type { AppointmentStatus, AppointmentType } from '../models/Appointment';

export type CreateAppointmentInput = {
  petId: string;
  date: Date;
  type?: AppointmentType;
  status?: AppointmentStatus;
  notes?: string | null;
};

export type ListAppointmentsFilters = {
  status?: AppointmentStatus;
  startDate?: Date;
  endDate?: Date;
};

export type UpdateAppointmentInput = Partial<CreateAppointmentInput>;

class AppointmentService {
  constructor(private readonly webhookProvider: IWebhookProvider = new N8nWebhookProvider()) {}

  async create(data: CreateAppointmentInput, tenantId: number): Promise<Appointment> {
    const pet = await Pet.findOne({ where: { [Op.and]: [{ id: data.petId }, { tenantId }] } });
    if (!pet) throw new NotFoundError('Pet não encontrado.');

    const appointment = await Appointment.create({
      tenantId,
      petId: data.petId,
      date: data.date,
      type: data.type ?? 'CONSULTATION',
      status: data.status ?? 'SCHEDULED',
      notes: data.notes?.trim() || null
    });

    // Disparo assíncrono para automação (n8n). Não deve quebrar o fluxo caso falhe.
    const full = await Appointment.findOne({
      where: { [Op.and]: [{ id: appointment.id }, { tenantId }] },
      include: [
        {
          model: Pet,
          as: 'pet',
          required: true,
          where: { tenantId },
          include: [
            {
              model: Tutor,
              as: 'tutor',
              required: true,
              where: { tenantId }
            }
          ]
        }
      ]
    });

    if (full) {
      const petWithTutor = (full as any).pet;
      if (petWithTutor?.tutor) {
        await this.webhookProvider.dispatchAppointmentCreated({
          appointmentId: full.id,
          tenantId: String(tenantId),
          petId: full.petId,
          petName: petWithTutor.name,
          tutorName: petWithTutor.tutor.name,
          tutorPhone: petWithTutor.tutor.phone,
          date: full.date.toISOString(),
          dateFormatted: full.date.toLocaleString('pt-BR'),
          type: full.type,
          status: full.status
        });
      }
    }

    return appointment;
  }

  async findAll(tenantId: number, filters: ListAppointmentsFilters): Promise<Appointment[]> {
    const and: unknown[] = [{ tenantId }];

    if (filters.status) and.push({ status: filters.status });

    if (filters.startDate || filters.endDate) {
      and.push({
        date: {
          ...(filters.startDate ? { [Op.gte]: filters.startDate } : {}),
          ...(filters.endDate ? { [Op.lte]: filters.endDate } : {})
        }
      });
    }

    const finalWhere = { [Op.and]: and };

    return Appointment.findAll({
      where: finalWhere,
      order: [['date', 'ASC']],
      include: [
        {
          model: Pet,
          as: 'pet',
          required: true,
          where: { tenantId },
          include: [
            {
              model: Tutor,
              as: 'tutor',
              required: true,
              where: { tenantId }
            }
          ]
        }
      ]
    });
  }

  async updateStatus(id: string, tenantId: number, status: AppointmentStatus): Promise<Appointment> {
    const appointment = await Appointment.findOne({ where: { [Op.and]: [{ id }, { tenantId }] } });
    if (!appointment) throw new NotFoundError('Agendamento não encontrado.');

    await appointment.update({ status });
    return appointment;
  }

  async update(id: string, tenantId: number, data: UpdateAppointmentInput): Promise<Appointment> {
    const appointment = await Appointment.findOne({ where: { [Op.and]: [{ id }, { tenantId }] } });
    if (!appointment) throw new NotFoundError('Agendamento não encontrado.');

    if (data.petId) {
      const pet = await Pet.findOne({ where: { [Op.and]: [{ id: data.petId }, { tenantId }] } });
      if (!pet) throw new NotFoundError('Pet não encontrado.');
      await appointment.update({ petId: data.petId });
    }

    const patch: Partial<Pick<CreateAppointmentInput, 'date' | 'type' | 'status' | 'notes'>> = {};
    if (data.date) patch.date = data.date;
    if (data.type) patch.type = data.type;
    if (data.status) patch.status = data.status;
    if (data.notes !== undefined) patch.notes = data.notes?.trim() || null;

    if (Object.keys(patch).length > 0) {
      await appointment.update(patch);
    }

    return appointment;
  }

  async remove(id: string, tenantId: number): Promise<void> {
    const appointment = await Appointment.findOne({ where: { [Op.and]: [{ id }, { tenantId }] } });
    if (!appointment) throw new NotFoundError('Agendamento não encontrado.');
    await appointment.destroy();
  }
}

export default new AppointmentService();

