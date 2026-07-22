import { Op } from 'sequelize';
import { BadRequestError, NotFoundError } from '../../../shared/errors/AppError';
import Appointment from '../models/Appointment';
import type { AppointmentStatus, ConfirmationStatus } from '../models/Appointment';

/**
 * Acesso a dados de agendamentos para fluxos que não passam pelo
 * `AppointmentService` (ex.: inbound n8n). Mantém queries isoladas
 * para facilitar testes e eventual troca de persistência.
 */
class AppointmentRepository {
  /**
   * Atualiza campos do agendamento a partir da ação inbound do tutor.
   *
   * @param status — discriminador semântico (não confundir com o ENUM
   *   `AppointmentStatus` completo): `'CONFIRMED'` grava
   *   `confirmationStatus = CONFIRMED`; `'CANCELED'` grava
   *   `status = CANCELED` (cancelamento da consulta).
   */
  async updateStatus(id: string, tenantId: number, status: string): Promise<Appointment> {
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
    } else {
      throw new BadRequestError(`Ação inbound inválida para atualização: ${status}`);
    }

    return appointment.reload();
  }
}

export default new AppointmentRepository();
