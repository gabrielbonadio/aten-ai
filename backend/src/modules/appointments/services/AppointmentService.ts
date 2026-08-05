import { Op } from 'sequelize';
import { NotFoundError } from '../../../shared/errors/AppError';
import { logger } from '../../../shared/logging/logger';
import webhookService from '../../../shared/services/WebhookService';
import { formatBrazilPhoneE164 } from '../../../shared/utils/formatBrazilPhoneE164';
import userRepository from '../../auth/repositories/UserRepository';
import Pet from '../../pets/models/Pet';
import Tenant from '../../tenants/models/Tenant';
import Tutor from '../../tutors/models/Tutor';
import Appointment from '../models/Appointment';
import type { AppointmentStatus, AppointmentType, PaymentStatus } from '../models/Appointment';

export type CreateAppointmentInput = {
  petId: string;
  date: Date;
  type?: AppointmentType;
  status?: AppointmentStatus;
  notes?: string | null;
  assignedUserId?: string | null;
  amountCents?: number | null;
  paymentStatus?: PaymentStatus;
};

export type ListAppointmentsFilters = {
  status?: AppointmentStatus;
  paymentStatus?: PaymentStatus;
  startDate?: Date;
  endDate?: Date;
  /** UUID já resolvido (controller trata `me` → user autenticado). */
  assignedUserId?: string;
};

export type UpdateAppointmentInput = Partial<CreateAppointmentInput>;

class AppointmentService {
  /**
   * Garante que o profissional existe no mesmo tenant.
   * Outro tenant → 404 (sem vazar existência cross-tenant).
   */
  private async assertAssigneeInTenant(
    assignedUserId: string,
    tenantId: number
  ): Promise<void> {
    const user = await userRepository.findByIdAndTenant(assignedUserId, tenantId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado.');
    }
  }

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

    const assignedUserId =
      data.assignedUserId === undefined ? null : data.assignedUserId;
    if (assignedUserId) {
      await this.assertAssigneeInTenant(assignedUserId, tenantId);
    }

    const appointment = await Appointment.create({
      tenantId,
      petId: data.petId,
      date: data.date,
      type: data.type ?? 'CONSULTATION',
      status: data.status ?? 'SCHEDULED',
      notes: data.notes?.trim() || null,
      assignedUserId,
      amountCents: data.amountCents === undefined ? null : data.amountCents,
      paymentStatus: data.paymentStatus ?? 'PENDING'
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
      logger.error('appointment.webhook_prepare_failed', {
        error: err instanceof Error ? err.message : String(err)
      });
    }

    return appointment;
  }

  async findAll(
    tenantId: number,
    filters: ListAppointmentsFilters,
    pagination: { limit: number; offset: number }
  ): Promise<{ rows: Appointment[]; count: number }> {
    const and: Array<Record<string, unknown>> = [{ tenantId }];

    if (filters.status) and.push({ status: filters.status });
    if (filters.paymentStatus) and.push({ paymentStatus: filters.paymentStatus });
    if (filters.assignedUserId) and.push({ assignedUserId: filters.assignedUserId });

    if (filters.startDate || filters.endDate) {
      and.push({
        date: {
          ...(filters.startDate ? { [Op.gte]: filters.startDate } : {}),
          ...(filters.endDate ? { [Op.lte]: filters.endDate } : {})
        }
      });
    }

    const finalWhere = { [Op.and]: and };

    return Appointment.findAndCountAll({
      where: finalWhere,
      order: [['date', 'ASC']],
      limit: pagination.limit,
      offset: pagination.offset,
      distinct: true,
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

    // Idempotente: evita write desnecessário quando o status já é o desejado.
    if (appointment.status === status) {
      return appointment;
    }

    await appointment.update({ status });
    return appointment;
  }

  async update(id: string, tenantId: number, data: UpdateAppointmentInput): Promise<Appointment> {
    const appointment = await Appointment.findOne({ where: { [Op.and]: [{ id }, { tenantId }] } });
    if (!appointment) throw new NotFoundError('Agendamento não encontrado.');

    if (data.petId) {
      const pet = await Pet.findOne({ where: { [Op.and]: [{ id: data.petId }, { tenantId }] } });
      if (!pet) throw new NotFoundError('Pet não encontrado.');
    }

    if (data.assignedUserId) {
      await this.assertAssigneeInTenant(data.assignedUserId, tenantId);
    }

    const patch: Partial<{
      petId: string;
      date: Date;
      type: AppointmentType;
      status: AppointmentStatus;
      notes: string | null;
      assignedUserId: string | null;
      amountCents: number | null;
      paymentStatus: PaymentStatus;
    }> = {};

    if (data.petId) patch.petId = data.petId;
    if (data.date) patch.date = data.date;
    if (data.type) patch.type = data.type;
    if (data.status) patch.status = data.status;
    if (data.notes !== undefined) patch.notes = data.notes?.trim() || null;
    if (data.assignedUserId !== undefined) patch.assignedUserId = data.assignedUserId;
    if (data.amountCents !== undefined) patch.amountCents = data.amountCents;
    if (data.paymentStatus !== undefined) patch.paymentStatus = data.paymentStatus;

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
