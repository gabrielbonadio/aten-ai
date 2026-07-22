import { Op } from 'sequelize';
import ConversationState from '../models/ConversationState';

/**
 * Catálogo centralizado das intenções aguardadas em conversas inbound.
 *
 * O schema permite STRING(64) — flexibilidade para o produto crescer —
 * mas tipar como union literal aqui dá autocomplete em call sites e
 * captura typos em compile time (ex.: 'confirm_appoinment' sem `t`).
 *
 * Adicionar nova intenção: incluir aqui antes de chamá-la em qualquer
 * Service / Controller.
 */
export type ConversationIntent =
  | 'confirm_appointment'
  | 'reschedule_appointment'
  | 'cancel_appointment';

/**
 * Repository do estado temporário de conversa de WhatsApp (TTL-based).
 *
 * Princípios de design:
 *
 * - **Acesso isolado**: services e controllers NUNCA tocam o model
 *   `ConversationState` diretamente. Trocar MySQL por Redis no futuro
 *   resume-se a substituir a implementação deste arquivo.
 *
 * - **Defesa em profundidade contra TTL stale**: `getState` filtra
 *   `expiresAt > NOW()` no SQL, NUNCA na aplicação. Entre o instante
 *   do TTL e a próxima rodada do GC (até ~24h, cron das 03:00),
 *   registros expirados NUNCA vazam para o caller.
 *
 * - **UPSERT idempotente**: `saveState` apoia-se no índice UNIQUE
 *   `(tenantId, tutorPhone)` para detectar conflito e atualizar in-place.
 *   Sem leitura prévia → menos latência e zero race condition.
 *
 * - **Log de contexto rico**: cada catch loga tenantId/phone/intent
 *   antes de relançar. Em produção, isso reduz drasticamente o MTTR de
 *   incidentes de inbound (onde o telefone do tutor é a chave de busca).
 */
class ConversationStateRepository {
  /**
   * Cria ou atualiza o estado de conversa para um (tenantId, telefone).
   *
   * Implementação via `Model.upsert()`. No MySQL, o Sequelize traduz
   * para `INSERT ... ON DUPLICATE KEY UPDATE`, usando nosso índice
   * UNIQUE composto `(tenantId, tutorPhone)` para resolver o conflito.
   *
   * O `expiresAt` é calculado fresh a cada chamada — atualizar uma
   * conversa "estende" o TTL. Isso é desejável: cada novo touchpoint
   * com o tutor renova a janela ativa da conversa.
   *
   * @returns o registro persistido (instância gerada pelo Sequelize).
   */
  async saveState(
    tenantId: number,
    phone: string,
    intent: ConversationIntent,
    referenceId: string,
    expiresInHours = 24
  ): Promise<ConversationState> {
    try {
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

      const [state] = await ConversationState.upsert({
        tenantId,
        tutorPhone: phone,
        expectedIntent: intent,
        referenceId,
        expiresAt
      });

      return state;
    } catch (err) {
      console.error(
        `[ConversationStateRepository] saveState falhou | tenantId=${tenantId} phone=${phone} intent=${intent}:`,
        err
      );
      throw new Error(
        `Não foi possível persistir o estado de conversa para o telefone ${phone}.`
      );
    }
  }

  /**
   * Busca o estado ATIVO (não expirado) de uma conversa.
   *
   * O filtro `expiresAt > NOW()` é obrigatório por design e não deve
   * ser removido: blinda contra a janela entre TTL atingido e próxima
   * execução do GC. Sem essa defesa, o n8n poderia receber contexto
   * morto e agir indevidamente sobre ele.
   *
   * @returns o estado ativo ou `null` se inexistente OU expirado.
   */
  async getState(tenantId: number, phone: string): Promise<ConversationState | null> {
    try {
      return await ConversationState.findOne({
        where: {
          [Op.and]: [
            { tenantId },
            { tutorPhone: phone },
            { expiresAt: { [Op.gt]: new Date() } }
          ]
        }
      });
    } catch (err) {
      console.error(
        `[ConversationStateRepository] getState falhou | tenantId=${tenantId} phone=${phone}:`,
        err
      );
      throw new Error(
        `Não foi possível buscar o estado de conversa para o telefone ${phone}.`
      );
    }
  }

  /**
   * Apaga FISICAMENTE o estado de conversa de um (tenant, telefone).
   *
   * Chamar quando o fluxo conversacional concluir com sucesso (ex.: o
   * tutor confirmou o agendamento). Não há soft delete: a tabela é
   * volátil por design e o índice UNIQUE precisa do slot livre para
   * permitir novas conversas com o mesmo telefone.
   *
   * @returns número de registros apagados (0 ou 1 — UNIQUE garante).
   */
  async clearState(tenantId: number, phone: string): Promise<number> {
    try {
      return await ConversationState.destroy({
        where: { [Op.and]: [{ tenantId }, { tutorPhone: phone }] }
      });
    } catch (err) {
      console.error(
        `[ConversationStateRepository] clearState falhou | tenantId=${tenantId} phone=${phone}:`,
        err
      );
      throw new Error(
        `Não foi possível remover o estado de conversa para o telefone ${phone}.`
      );
    }
  }

  /**
   * Garbage collector global: apaga TODOS os estados com `expiresAt`
   * no passado (`<= NOW()`).
   *
   * Não filtra por tenant — é varredura única do banco, consumida pelo
   * cron das 03:00 (Etapa 4). O índice em `expiresAt` evita full table
   * scan; sem ele, este DELETE travaria a tabela em produção sob volume
   * (mesmo com TTL curto, conversas paralelas se acumulam).
   *
   * @returns número de registros apagados.
   */
  async clearExpiredStates(): Promise<number> {
    try {
      const deleted = await ConversationState.destroy({
        where: { expiresAt: { [Op.lte]: new Date() } }
      });
      if (deleted > 0) {
        console.log(
          `[ConversationStateRepository] GC removeu ${deleted} estado(s) expirado(s).`
        );
      }
      return deleted;
    } catch (err) {
      console.error('[ConversationStateRepository] clearExpiredStates falhou:', err);
      throw new Error('Falha ao limpar estados de conversa expirados.');
    }
  }
}

export default new ConversationStateRepository();
