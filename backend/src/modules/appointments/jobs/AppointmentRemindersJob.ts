import { Op } from 'sequelize';
import webhookService from '../../../shared/services/WebhookService';
import { formatBrazilPhoneE164 } from '../../../shared/utils/formatBrazilPhoneE164';
import conversationStateRepository from '../../conversations/repositories/ConversationStateRepository';
import Pet from '../../pets/models/Pet';
import Tenant from '../../tenants/models/Tenant';
import Tutor from '../../tutors/models/Tutor';
import Appointment from '../models/Appointment';
import type { AppointmentWithRelations } from './types';

/**
 * Hora local do servidor em que o job dispara.
 * Spec: todos os dias às 08:00 (horário local do servidor).
 */
const RUN_HOUR = 8;
const RUN_MINUTE = 0;

type ReminderRunResult = {
  found: number;
  sent: number;
  failed: number;
};

/**
 * Job de lembretes de consultas (D-1).
 *
 * Responsabilidade: todos os dias às 08:00 (horário local), varrer todos
 * os agendamentos do dia seguinte que ainda estão `PENDING` e que NÃO
 * receberam lembrete, e para cada um:
 *   1. Marcar `reminderSentAt` (claim-first / idempotência).
 *   2. Gravar o `ConversationState` esperando a intenção
 *      `confirm_appointment` por 24h — habilita o fluxo inbound do n8n
 *      a interpretar a resposta do tutor.
 *   3. Despachar o evento `appointment.reminder` para o n8n humanizar
 *      a mensagem e enviar via WhatsApp.
 *
 * Princípios de design:
 *
 * - **Sem dependência externa de cron**: usa `setTimeout` recursivo com
 *   recálculo do delay a cada tick. Eliminamos drift acumulado e ficamos
 *   imunes a mudanças de horário (DST).
 *
 * - **Claim-first**: marcamos `reminderSentAt` ANTES de despachar o
 *   webhook. Se o UPDATE falha, o webhook não dispara — preferimos perder
 *   um lembrete a entregar dois WhatsApps para o mesmo tutor. Para
 *   automações de mensageria essa é a ordem correta de operações.
 *
 * - **Falha por item não derruba o lote**: cada agendamento processa em
 *   try/catch isolado. Um pet órfão ou um tutor sem telefone não impede
 *   o processamento dos demais.
 *
 * - **Não reentrante**: `isRunning` impede que um tick comece antes do
 *   anterior terminar (improvável com job diário, mas trivial garantir).
 */
class AppointmentRemindersJob {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  start(): void {
    if (this.timer) {
      console.warn('[AppointmentRemindersJob] start() chamado com job já agendado; ignorando.');
      return;
    }
    this.scheduleNext();
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      console.log('[AppointmentRemindersJob] timer cancelado.');
    }
  }

  /**
   * Executa o processamento uma única vez.
   *
   * Exposto publicamente para permitir:
   * - Endpoint administrativo de "run-on-demand"
   * - Testes de integração sem depender de relógio
   */
  async runOnce(): Promise<ReminderRunResult> {
    if (this.isRunning) {
      console.warn('[AppointmentRemindersJob] já em execução; pulando esta chamada.');
      return { found: 0, sent: 0, failed: 0 };
    }
    this.isRunning = true;

    const startedAt = Date.now();
    const result: ReminderRunResult = { found: 0, sent: 0, failed: 0 };

    try {
      const { start, end } = this.tomorrowWindow();
      console.log(
        `[AppointmentRemindersJob] iniciando varredura | janela ${start.toISOString()} → ${end.toISOString()}`
      );

      const appointments = (await Appointment.findAll({
        where: {
          [Op.and]: [
            { confirmationStatus: 'PENDING' },
            { reminderSentAt: null },
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
            console.warn(
              `[AppointmentRemindersJob] appointment ${appt.id} sem tenant/pet/tutor; pulando.`
            );
            result.failed++;
            continue;
          }

          // CLAIM-FIRST: marca como notificado ANTES de despachar.
          // Garante idempotência mesmo em retries / múltiplas instâncias.
          await appt.update({ reminderSentAt: new Date() });

          // Normalizado UMA VEZ e reusado: o `saveState` PRECISA persistir
          // o telefone no mesmo formato que enviamos ao n8n, pois é a
          // chave de lookup do fluxo inbound (`getState(tenantId, phone)`
          // na rota `POST /api/v1/conversations/reply`). Qualquer
          // divergência aqui transforma um reply válido do tutor em
          // "Sessão expirada ou não encontrada".
          const tutorPhoneE164 = formatBrazilPhoneE164(tutor.phone);

          // Grava o estado de conversa ANTES do dispatch para evitar
          // race condition: o n8n entrega a mensagem em milissegundos
          // e o tutor pode responder antes do estado existir, fazendo
          // o webhook inbound retornar 400 sem motivo.
          //
          // Falha aqui NUNCA pode bloquear o envio do lembrete: é
          // preferível mandar o WhatsApp sem estado (no pior caso a
          // resposta cai num fluxo de fallback genérico do n8n) do que
          // não mandar o lembrete por uma falha do MySQL.
          if (tutorPhoneE164) {
            try {
              await conversationStateRepository.saveState(
                appt.tenantId,
                tutorPhoneE164,
                'confirm_appointment',
                appt.id,
                24
              );
            } catch (stateErr) {
              console.warn(
                `[AppointmentRemindersJob] saveState falhou para appointment ${appt.id} (phone=${tutorPhoneE164}); seguindo com o dispatch sem estado:`,
                stateErr
              );
            }
          } else {
            console.warn(
              `[AppointmentRemindersJob] telefone do tutor inválido para appointment ${appt.id}; estado de conversa não gravado.`
            );
          }

          webhookService.dispatch('appointment.reminder', {
            appointment_id: appt.id,
            tenant_id: appt.tenantId,
            clinic_name: tenant.name,
            tutor_name: tutor.name,
            tutor_phone: tutorPhoneE164,
            pet_name: pet.name,
            pet_species: pet.species ?? null,
            appointment_datetime: appt.date.toLocaleString('pt-BR', {
              timeZone: 'America/Sao_Paulo'
            }),
            appointment_datetime_iso: appt.date.toISOString(),
            appointment_type: appt.type
          });

          result.sent++;
        } catch (err) {
          console.error(
            `[AppointmentRemindersJob] falha ao processar appointment ${appt.id}:`,
            err
          );
          result.failed++;
        }
      }

      const elapsedMs = Date.now() - startedAt;
      console.log(
        `[AppointmentRemindersJob] concluído em ${elapsedMs}ms | encontrados: ${result.found}, enviados: ${result.sent}, falhas: ${result.failed}`
      );
    } catch (err) {
      // Falha catastrófica (DB offline, query inválida). NUNCA propaga
      // para fora do job: o scheduler precisa continuar.
      console.error('[AppointmentRemindersJob] falha catastrófica na varredura:', err);
    } finally {
      this.isRunning = false;
    }

    return result;
  }

  /** Início e fim do "amanhã" em horário local do servidor. */
  private tomorrowWindow(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
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
    console.log(
      `[AppointmentRemindersJob] próxima execução: ${nextFormatted} (em ${Math.round(delayMs / 60_000)} min)`
    );

    this.timer = setTimeout(async () => {
      this.timer = null;
      try {
        await this.runOnce();
      } catch (err) {
        // `runOnce` já trata erros internamente; defendemos contra
        // rejeições inesperadas vindas de I/O subjacente.
        console.error('[AppointmentRemindersJob] erro inesperado no tick:', err);
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

export default new AppointmentRemindersJob();
