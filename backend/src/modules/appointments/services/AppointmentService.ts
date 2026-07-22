import { Op } from 'sequelize';
import { NotFoundError } from '../../../shared/errors/AppError';
import webhookService from '../../../shared/services/WebhookService';
import { formatBrazilPhoneE164 } from '../../../shared/utils/formatBrazilPhoneE164';
import Pet from '../../pets/models/Pet';
import Tenant from '../../tenants/models/Tenant';
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
  async create(data: CreateAppointmentInput, tenantId: number): Promise<Appointment> {
    const pet = await Pet.findOne({
      where: { [Op.and]: [{ id: data.petId }, { tenantId }] },
      include: [
        {
          model: Tutor,
          as: 'tutor',
          required: true,
          where: { tenantId }
        }
      ]
    });
    if (!pet) throw new NotFoundError('Pet não encontrado.');

    const appointment = await Appointment.create({
      tenantId,
      petId: data.petId,
      date: data.date,
      type: data.type ?? 'CONSULTATION',
      status: data.status ?? 'SCHEDULED',
      notes: data.notes?.trim() || null
    });

    // Disparo fire-and-forget para automação (n8n).
    // Falha aqui NUNCA pode interromper a criação do agendamento.
    try {
      const tenant = await Tenant.findByPk(tenantId);
      const tutor = (pet as Pet & { tutor: Tutor }).tutor;

      if (tenant && tutor) {
        webhookService.dispatch('appointment.created', {
          appointment_id: appointment.id,
          clinic_name: tenant.name,
          tutor_name: tutor.name,
          tutor_phone: formatBrazilPhoneE164(tutor.phone),
          pet_name: pet.name,
          appointment_datetime: appointment.date.toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo'
          }),
          appointment_datetime_iso: appointment.date.toISOString(),
          appointment_type: appointment.type,
          appointment_status: appointment.status
        });
      }
    } catch (err) {
      console.error('[AppointmentService] Falha ao preparar webhook appointment.created:', err);
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
