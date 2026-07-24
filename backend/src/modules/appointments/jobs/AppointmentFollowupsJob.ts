import { Op } from 'sequelize';
import { logger } from '../../../shared/logging/logger';
import webhookService from '../../../shared/services/WebhookService';
import { formatBrazilPhoneE164 } from '../../../shared/utils/formatBrazilPhoneE164';
import Pet from '../../pets/models/Pet';
import Tenant from '../../tenants/models/Tenant';
import Tutor from '../../tutors/models/Tutor';
import Appointment from '../models/Appointment';
import type { AppointmentWithRelations } from './types';

/**
 * Hora local do servidor em que o job dispara.
 * Spec: todos os dias às 09:00 — uma hora depois dos lembretes para
 * não competir por conexões do pool nem saturar o n8n no mesmo minuto.
 */
const RUN_HOUR = 9;
const RUN_MINUTE = 0;

/**
 * Janela de pós-consulta: 3 dias após a data do atendimento.
 * Se o job rodar dia 15, busca consultas concluídas no dia 12.
 */
const DAYS_AFTER_APPOINTMENT = 3;

type FollowupRunResult = {
  found: number;
  sent: number;
  failed: number;
};

/**
 * Job de follow-up pós-consulta (D+3).
 *
 * Responsabilidade: todos os dias às 09:00 (horário local), varrer todos
 * os agendamentos com `status='COMPLETED'` ocorridos há 3 dias que ainda
 * NÃO receberam follow-up, marcá-los como notificados e despachar o
 * evento `appointment.followup` para o n8n humanizar a mensagem e enviar
 * a sondagem de como o pet está se recuperando.
 *
 * Os princípios de design (scheduler nativo via setTimeout, claim-first,
 * isolamento de falha por item, não-reentrância) são idênticos aos do
 * `AppointmentRemindersJob`. Quando aparecer o terceiro job diário, vale
 * extrair um `ScheduledDailyJob` base com template method para o tick.
 */
class AppointmentFollowupsJob {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  start(): void {
    if (this.timer) {
      logger.warn('job.followups.start_ignored_already_scheduled');
      return;
    }
    this.scheduleNext();
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      logger.info('job.followups.timer_cancelled');
    }
  }

  /**
   * Executa o processamento uma única vez.
   *
   * Exposto publicamente para permitir:
   * - Endpoint administrativo de "run-on-demand"
   * - Testes de integração sem depender de relógio
   */
  async runOnce(): Promise<FollowupRunResult> {
    if (this.isRunning) {
      logger.warn('job.followups.skip_already_running');
      return { found: 0, sent: 0, failed: 0 };
    }
    this.isRunning = true;

    const startedAt = Date.now();
    const result: FollowupRunResult = { found: 0, sent: 0, failed: 0 };

    try {
      const { start, end } = this.pastWindow();
      logger.info('job.followups.scan_start', {
        windowStart: start.toISOString(),
        windowEnd: end.toISOString()
      });

      const appointments = (await Appointment.findAll({
        where: {
          [Op.and]: [
            { status: 'COMPLETED' },
            { followupSentAt: null },
            { date: { [Op.between]: [start, end] } }
          ]
        },
        include: [
          { model: Tenant, as: 'tenant', required: true },
          {
            model: Pet,
            as: 'pet',
            required: true,
            include: [{ model: Tutor, as: 'tutor', required: true }]
          }
        ],
        order: [['date', 'ASC']]
      })) as AppointmentWithRelations[];

      result.found = appointments.length;

      for (const appt of appointments) {
        try {
          const tenant = appt.tenant;
          const pet = appt.pet;
          const tutor = pet?.tutor;

          if (!tenant || !pet || !tutor) {
            // `required: true` no include já deveria garantir, mas defendemos
            // contra inconsistências de dados (FK órfão, paranoid delete, etc).
            logger.warn('job.followups.missing_relations', { appointmentId: appt.id });
            result.failed++;
            continue;
          }

          // CLAIM-FIRST: marca como notificado ANTES de despachar.
          // Garante idempotência mesmo em retries / múltiplas instâncias.
          await appt.update({ followupSentAt: new Date() });

          webhookService.dispatch('appointment.followup', {
            appointment_id: appt.id,
            tenant_id: appt.tenantId,
            clinic_name: tenant.name,
            tutor_name: tutor.name,
            tutor_phone: formatBrazilPhoneE164(tutor.phone),
            pet_name: pet.name,
            pet_species: pet.species ?? null,
            appointment_datetime: appt.date.toLocaleString('pt-BR', {
              timeZone: 'America/Sao_Paulo'
            }),
            appointment_datetime_iso: appt.date.toISOString(),
            appointment_type: appt.type,
            days_since_appointment: DAYS_AFTER_APPOINTMENT
          });

          result.sent++;
        } catch (err) {
          logger.error('job.followups.item_failed', {
            appointmentId: appt.id,
            error: err instanceof Error ? err.message : String(err)
          });
          result.failed++;
        }
      }

      const elapsedMs = Date.now() - startedAt;
      logger.info('job.followups.scan_done', {
        elapsedMs,
        found: result.found,
        sent: result.sent,
        failed: result.failed
      });
    } catch (err) {
      // Falha catastrófica (DB offline, query inválida). NUNCA propaga
      // para fora do job: o scheduler precisa continuar.
      logger.error('job.followups.scan_catastrophic', {
        error: err instanceof Error ? err.message : String(err)
      });
    } finally {
      this.isRunning = false;
    }

    return result;
  }

  /**
   * Início e fim do dia que ocorreu há `DAYS_AFTER_APPOINTMENT` dias
   * em horário local do servidor. O construtor numérico de `Date` faz
   * roll-over automático para meses/anos quando o dia fica negativo
   * (ex.: rodar em 02/Mar busca 27/Fev — incluindo anos bissextos).
   */
  private pastWindow(): { start: Date; end: Date } {
    const now = new Date();
    const targetDay = now.getDate() - DAYS_AFTER_APPOINTMENT;
    const start = new Date(now.getFullYear(), now.getMonth(), targetDay, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), targetDay, 23, 59, 59, 999);
    return { start, end };
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

  /**
   * Agenda a próxima execução. Sempre RE-CALCULA o delay com base no
   * relógio real do sistema, eliminando drift acumulado em execuções
   * longas e absorvendo mudanças de horário de verão automaticamente.
   */
  private scheduleNext(): void {
    const next = this.nextRunDate();
    const delayMs = next.getTime() - Date.now();
    const nextFormatted = next.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    logger.info('job.followups.next_run', {
      nextRun: nextFormatted,
      delayMinutes: Math.round(delayMs / 60_000)
    });

    this.timer = setTimeout(async () => {
      this.timer = null;
      try {
        await this.runOnce();
      } catch (err) {
        // `runOnce` já trata erros internamente; defendemos contra
        // rejeições inesperadas vindas de I/O subjacente.
        logger.error('job.followups.tick_unexpected', {
          error: err instanceof Error ? err.message : String(err)
        });
      } finally {
        // Re-agenda independente de sucesso ou falha — o relógio não para.
        this.scheduleNext();
      }
    }, delayMs);

    // Permite que o processo encerre limpo em testes/scripts sem
    // depender de `stop()` manual. Em produção o `app.listen()` mantém
    // o event loop vivo, então `unref` não causa exit prematuro.
    this.timer.unref?.();
  }
}

export default new AppointmentFollowupsJob();
