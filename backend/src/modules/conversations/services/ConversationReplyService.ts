import { BadRequestError } from '../../../shared/errors/AppError';
import appointmentRepository from '../../appointments/repositories/AppointmentRepository';
import conversationStateRepository from '../repositories/ConversationStateRepository';
import type { ConversationIntent } from '../repositories/ConversationStateRepository';

export type ConversationReplyAction = 'CONFIRMED' | 'CANCELED';

/**
 * Processa a resposta inbound do tutor (triada no n8n) e efetiva a
 * mutação no agendamento correlato, encerrando o estado de conversa.
 */
class ConversationReplyService {
  async processReply(
    tenantId: number,
    tutorPhone: string,
    intent: ConversationIntent,
    action: ConversationReplyAction
  ): Promise<void> {
    const state = await conversationStateRepository.getState(tenantId, tutorPhone);

    if (!state) {
      throw new BadRequestError('Sessão expirada ou não encontrada.');
    }

    if (state.expectedIntent !== intent) {
      throw new BadRequestError(
        `Desvio de fluxo: a conversa esperava a intenção "${state.expectedIntent}", mas foi recebido "${intent}".`
      );
    }

    await appointmentRepository.updateStatus(state.referenceId, tenantId, action);

    await conversationStateRepository.clearState(tenantId, tutorPhone);
  }
}

export default new ConversationReplyService();
