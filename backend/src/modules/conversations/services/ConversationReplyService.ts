import { BadRequestError } from '../../../shared/errors/AppError';
import appointmentRepository from '../../appointments/repositories/AppointmentRepository';
import conversationStateRepository from '../repositories/ConversationStateRepository';
import type { ConversationIntent } from '../repositories/ConversationStateRepository';

export type ConversationReplyAction = 'CONFIRMED' | 'CANCELED' | 'RESCHEDULE';

export type ProcessReplyInput = {
  tenantId: number;
  tutorPhone: string;
  intent: ConversationIntent;
  action: ConversationReplyAction;
  /** ISO parseado; obrigatório quando action = RESCHEDULE. */
  suggestedDate?: Date;
};

/**
 * Processa a resposta inbound do tutor (triada no n8n) e efetiva a
 * mutação no agendamento correlato, encerrando o estado de conversa.
 *
 * Ordem (anti-race): mutar appointment → clearState.
 * Preferimos retry idempotente da mutação a limpar o state cedo demais
 * (perderia a chance de reprocessar um 5xx no meio do caminho).
 */
class ConversationReplyService {
  async processReply(input: ProcessReplyInput): Promise<void> {
    const { tenantId, tutorPhone, intent, action, suggestedDate } = input;

    const state = await conversationStateRepository.getState(tenantId, tutorPhone);

    if (!state) {
      throw new BadRequestError('Sessão expirada ou não encontrada.');
    }

    if (state.expectedIntent !== intent) {
      throw new BadRequestError(
        `Desvio de fluxo: a conversa esperava a intenção "${state.expectedIntent}", mas foi recebido "${intent}".`
      );
    }

    if (action === 'RESCHEDULE') {
      if (!suggestedDate) {
        throw new BadRequestError('suggestedDate é obrigatório para reagendamento.');
      }
      await appointmentRepository.updateStatus(state.referenceId, tenantId, 'RESCHEDULE', {
        newDate: suggestedDate
      });
    } else if (action === 'CONFIRMED' || action === 'CANCELED') {
      await appointmentRepository.updateStatus(state.referenceId, tenantId, action);
    } else {
      throw new BadRequestError(`Ação inbound inválida: ${String(action)}`);
    }

    await conversationStateRepository.clearState(tenantId, tutorPhone);
  }
}

export default new ConversationReplyService();
