import { Op } from 'sequelize';
import { BadRequestError, NotFoundError } from '../../../shared/errors/AppError';
import Appointment from '../models/Appointment';
import type { AppointmentStatus, ConfirmationStatus } from '../models/Appointment';

export type InboundAppointmentAction = 'CONFIRMED' | 'CANCELED' | 'RESCHEDULE';

/**
 * Acesso a dados de agendamentos para fluxos que não passam pelo
 * `AppointmentService` (ex.: inbound n8n). Mantém queries isoladas
 * para facilitar testes e eventual troca de persistência.
 */
class AppointmentRepository {
  /**
   * Atualiza o agendamento a partir da ação inbound do tutor.
   *
   * - `CONFIRMED` → `confirmationStatus = CONFIRMED`
   * - `CANCELED` → `status = CANCELED`
   * - `RESCHEDULE` → `date = newDate` + `confirmationStatus = RESCHEDULED`
   *   (enum já existente; sem migration nesta fatia)
   */
  async updateStatus(
    id: string,
    tenantId: number,
    status: InboundAppointmentAction | string,
    options?: { newDate?: Date }
  ): Promise<Appointment> {
    const appointment = await Appointment.findOne({
      where: { [Op.and]: [{ id }, { tenantId }] }
    });
    if (!appointment) {
      throw new NotFoundError('Agendamento não encontrado.');
    }

    if (status === 'CONFIRMED') {
      await appointment.update({ confirmationStatus: 'CONFIRMED' as ConfirmationStatus });
    } else if (status === 'CANCELED') {
      await appointment.update({ status: 'CANCELED' as AppointmentStatus });
    } else if (status === 'RESCHEDULE') {
      const newDate = options?.newDate;
      if (!newDate || Number.isNaN(newDate.getTime())) {
        throw new BadRequestError('Data de reagendamento inválida.');
      }
      if (newDate.getTime() <= Date.now()) {
        throw new BadRequestError('A nova data do agendamento deve ser futura.');
      }
      // Claim-first da mutação: grava data + status antes do caller limpar o state.
      await appointment.update({
        date: newDate,
        confirmationStatus: 'RESCHEDULED' as ConfirmationStatus
      });
    } else {
      throw new BadRequestError(`Ação inbound inválida para atualização: ${status}`);
    }

    return appointment.reload();
  }
}

export default new AppointmentRepository();
