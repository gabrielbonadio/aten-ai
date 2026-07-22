import conversationStateRepository from '../repositories/ConversationStateRepository';

/**
 * Horário local do servidor: equivalente semântico ao cron `0 3 * * *`
 * (todo dia às 03:00).
 */
const RUN_HOUR = 3;
const RUN_MINUTE = 0;

/**
 * Garbage collector de `conversation_states`: remove fisicamente linhas
 * com `expiresAt <= NOW()`.
 *
 * Usa o mesmo motor de agendamento dos jobs de appointments (setTimeout
 * recursivo com recálculo do delay) — não há `node-cron` no projeto.
 */
class ConversationGarbageCollector {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  start(): void {
    if (this.timer) {
      console.warn('[ConversationGC] start() chamado com job já agendado; ignorando.');
      return;
    }
    this.scheduleNext();
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      console.log('[ConversationGC] timer cancelado.');
    }
  }

  /**
   * Executa uma única rodada de limpeza (útil para testes ou execução manual).
   * @returns quantidade de linhas removidas (0 em caso de erro ou skip por reentrância).
   */
  async runOnce(): Promise<number> {
    if (this.isRunning) {
      console.warn('[ConversationGC] já em execução; pulando esta chamada.');
      return 0;
    }
    this.isRunning = true;

    try {
      console.log('[ConversationGC] iniciando limpeza de estados expirados (conversation_states)...');

      const deleted = await conversationStateRepository.clearExpiredStates();

      console.log(`[ConversationGC] limpeza concluída. Registros removidos: ${deleted}`);
      return deleted;
    } catch (err) {
      // Nunca propaga: o scheduler deve continuar mesmo com DB intermitente.
      console.error('[ConversationGC] falha ao executar clearExpiredStates:', err);
      return 0;
    } finally {
      this.isRunning = false;
    }
  }

  /** Próxima ocorrência de RUN_HOUR:RUN_MINUTE em horário local. */
  private nextRunDate(): Date {
    const now = new Date();
    const next = new Date(now);
    next.setHours(RUN_HOUR, RUN_MINUTE, 0, 0);
    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  private scheduleNext(): void {
    const next = this.nextRunDate();
    const delayMs = next.getTime() - Date.now();
    const nextFormatted = next.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    console.log(
      `[ConversationGC] próxima execução (cron 0 3 * * *): ${nextFormatted} (em ~${Math.round(delayMs / 60_000)} min)`
    );

    this.timer = setTimeout(() => {
      this.timer = null;
      // Fire-and-forget: não bloqueia o tick do setTimeout; erros tratados em runOnce.
      void (async () => {
        try {
          await this.runOnce();
        } catch (err) {
          console.error('[ConversationGC] erro inesperado no tick (defesa extra):', err);
        } finally {
          this.scheduleNext();
        }
      })();
    }, delayMs);

    this.timer.unref?.();
  }
}

const conversationGarbageCollector = new ConversationGarbageCollector();

/** Inicia o agendador diário (03:00 horário local). Chamar após `app.listen`. */
export function startConversationGC(): void {
  conversationGarbageCollector.start();
}

export function stopConversationGC(): void {
  conversationGarbageCollector.stop();
}

/** Exposto para testes manuais / admin on-demand. */
export async function runConversationGCOnce(): Promise<number> {
  return conversationGarbageCollector.runOnce();
}
