import { logger } from '../../../shared/logging/logger';
import { metrics } from '../../../shared/observability/metrics';
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
      logger.warn('job.conversation_gc.start_ignored_already_scheduled');
      return;
    }
    this.scheduleNext();
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      logger.info('job.conversation_gc.timer_cancelled');
    }
  }

  /**
   * Executa uma única rodada de limpeza (útil para testes ou execução manual).
   * @returns quantidade de linhas removidas (0 em caso de erro ou skip por reentrância).
   */
  async runOnce(): Promise<number> {
    if (this.isRunning) {
      logger.warn('job.conversation_gc.skip_already_running');
      return 0;
    }
    this.isRunning = true;
    const startedAt = Date.now();

    try {
      logger.info('job.conversation_gc.scan_start');

      const deleted = await conversationStateRepository.clearExpiredStates();

      const elapsedMs = Date.now() - startedAt;
      logger.info('job.conversation_gc.scan_done', { deleted, elapsedMs });
      metrics.recordJobCounters('conversationGC', { deleted }, elapsedMs);
      return deleted;
    } catch (err) {
      // Nunca propaga: o scheduler deve continuar mesmo com DB intermitente.
      logger.error('job.conversation_gc.scan_failed', {
        error: err instanceof Error ? err.message : String(err)
      });
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
    logger.info('job.conversation_gc.next_run', {
      nextRun: nextFormatted,
      delayMinutes: Math.round(delayMs / 60_000)
    });

    this.timer = setTimeout(() => {
      this.timer = null;
      // Fire-and-forget: não bloqueia o tick do setTimeout; erros tratados em runOnce.
      void (async () => {
        try {
          await this.runOnce();
        } catch (err) {
          logger.error('job.conversation_gc.tick_unexpected', {
            error: err instanceof Error ? err.message : String(err)
          });
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
