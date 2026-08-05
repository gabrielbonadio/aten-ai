import { Op } from 'sequelize';
import { logger } from '../../../shared/logging/logger';
import { metrics } from '../../../shared/observability/metrics';
import webhookService from '../../../shared/services/WebhookService';
import { formatBrazilPhoneE164 } from '../../../shared/utils/formatBrazilPhoneE164';
import Pet from '../../pets/models/Pet';
import Tenant from '../../tenants/models/Tenant';
import Tutor from '../../tutors/models/Tutor';
import PetVaccination from '../models/PetVaccination';

/**
 * Hora local do servidor. Após reminders (08:00) e follow-ups (09:00)
 * para não saturar o pool / n8n no mesmo minuto.
 */
const RUN_HOUR = 10;
const RUN_MINUTE = 0;

type VaccineReminderRunResult = {
  found: number;
  sent: number;
  failed: number;
};

type PetVaccinationWithRelations = PetVaccination & {
  tenant?: Tenant;
  pet?: Pet & { tutor?: Tutor };
};

/**
 * Job de lembretes de vacina (D-1 de `nextDueAt`).
 *
 * Claim-first em `reminderSentAt` (anti double-WhatsApp), sem ConversationState
 * (MVP outbound only — sem NLP/inbound nesta fatia).
 */
class VaccineRemindersJob {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  start(): void {
    if (this.timer) {
      logger.warn('job.vaccine_reminders.start_ignored_already_scheduled');
      return;
    }
    this.scheduleNext();
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      logger.info('job.vaccine_reminders.timer_cancelled');
    }
  }

  async runOnce(): Promise<VaccineReminderRunResult> {
    if (this.isRunning) {
      logger.warn('job.vaccine_reminders.skip_already_running');
      return { found: 0, sent: 0, failed: 0 };
    }
    this.isRunning = true;

    const startedAt = Date.now();
    const result: VaccineReminderRunResult = { found: 0, sent: 0, failed: 0 };

    try {
      const { start, end } = this.tomorrowWindow();
      logger.info('job.vaccine_reminders.scan_start', {
        windowStart: start.toISOString(),
        windowEnd: end.toISOString()
      });

      const rows = (await PetVaccination.findAll({
        where: {
          [Op.and]: [{ reminderSentAt: null }, { nextDueAt: { [Op.between]: [start, end] } }]
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
        order: [['nextDueAt', 'ASC']]
      })) as PetVaccinationWithRelations[];

      result.found = rows.length;

      for (const row of rows) {
        try {
          const tenant = row.tenant;
          const pet = row.pet;
          const tutor = pet?.tutor;

          if (!tenant || !pet || !tutor) {
            logger.warn('job.vaccine_reminders.missing_relations', { vaccinationId: row.id });
            result.failed++;
            continue;
          }

          // CLAIM-FIRST: marca antes do dispatch.
          await row.update({ reminderSentAt: new Date() });

          const tutorPhoneE164 = formatBrazilPhoneE164(tutor.phone);
          if (!tutorPhoneE164) {
            logger.warn('job.vaccine_reminders.invalid_tutor_phone', { vaccinationId: row.id });
          }

          webhookService.dispatch('vaccine.reminder', {
            vaccination_id: row.id,
            tenant_id: row.tenantId,
            clinic_name: tenant.name,
            tutor_name: tutor.name,
            tutor_phone: tutorPhoneE164,
            pet_name: pet.name,
            pet_species: pet.species ?? null,
            vaccine_name: row.name,
            applied_at_iso: row.appliedAt ? row.appliedAt.toISOString() : null,
            next_due_datetime: row.nextDueAt.toLocaleString('pt-BR', {
              timeZone: 'America/Sao_Paulo'
            }),
            next_due_datetime_iso: row.nextDueAt.toISOString()
          });

          result.sent++;
        } catch (err) {
          logger.error('job.vaccine_reminders.item_failed', {
            vaccinationId: row.id,
            error: err instanceof Error ? err.message : String(err)
          });
          result.failed++;
        }
      }

      const elapsedMs = Date.now() - startedAt;
      logger.info('job.vaccine_reminders.scan_done', {
        elapsedMs,
        found: result.found,
        sent: result.sent,
        failed: result.failed
      });
      metrics.recordJobRun('vaccineReminders', {
        found: result.found,
        sent: result.sent,
        failed: result.failed,
        durationMs: elapsedMs
      });
    } catch (err) {
      logger.error('job.vaccine_reminders.scan_catastrophic', {
        error: err instanceof Error ? err.message : String(err)
      });
    } finally {
      this.isRunning = false;
    }

    return result;
  }

  private tomorrowWindow(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
    return { start, end };
  }

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
    logger.info('job.vaccine_reminders.next_run', {
      nextRun: nextFormatted,
      delayMinutes: Math.round(delayMs / 60_000)
    });

    this.timer = setTimeout(async () => {
      this.timer = null;
      try {
        await this.runOnce();
      } catch (err) {
        logger.error('job.vaccine_reminders.tick_unexpected', {
          error: err instanceof Error ? err.message : String(err)
        });
      } finally {
        this.scheduleNext();
      }
    }, delayMs);

    this.timer.unref?.();
  }
}

export default new VaccineRemindersJob();
