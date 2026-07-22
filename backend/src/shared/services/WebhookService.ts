import axios, { type AxiosInstance } from 'axios';
import { logger } from '../logging/logger';

/**
 * Catálogo centralizado dos eventos despachados ao n8n.
 *
 * Adicione um novo evento aqui antes de chamá-lo em qualquer service.
 * A union força tipagem em todos os call sites e previne typos
 * (`'medicalrecord.created'` em vez de `'medical_record.created'`, por exemplo).
 */
export type N8nWebhookEvent =
  | 'appointment.created'
  | 'appointment.reminder'
  | 'appointment.followup'
  | 'medical_record.created';

export type N8nWebhookPayload = Record<string, unknown>;

/**
 * Serviço centralizado de webhooks para o n8n.
 *
 * Princípios:
 * - **Fire-and-forget por design**: `dispatch` retorna `void` (não `Promise`).
 *   Callers não conseguem `await` por engano nem esquecer de descartar a Promise.
 * - **Resiliência total**: qualquer falha (URL ausente, timeout, 5xx) é logada
 *   internamente. NUNCA propaga exceção. Falha de WhatsApp não pode derrubar
 *   o fluxo crítico de negócio (criação de consulta, prontuário, etc.).
 * - **Body padrão**: `{ event: eventName, ...payload }`.
 * - **Autorização**: header `Authorization: Bearer <N8N_WEBHOOK_SECRET>` quando definido.
 */
export class WebhookService {
  private readonly http: AxiosInstance;

  constructor() {
    // Timeout curto: fire-and-forget não pode segurar recurso esperando o n8n.
    this.http = axios.create({ timeout: 5_000 });
  }

  /**
   * Despacha um evento para o n8n.
   *
   * Retorno `void` (síncrono) é proposital: a operação é fire-and-forget
   * e o caller jamais deve aguardá-la — qualquer espera bloquearia a
   * resposta HTTP do fluxo principal sem ganho.
   */
  dispatch(eventName: N8nWebhookEvent, payload: N8nWebhookPayload = {}): void {
    // Promise deliberadamente descartada; todos os erros são tratados em `send`.
    void this.send(eventName, payload);
  }

  private async send(eventName: N8nWebhookEvent, payload: N8nWebhookPayload): Promise<void> {
    const url = process.env.N8N_WEBHOOK_URL?.trim();
    if (!url) {
      logger.warn('webhook.skipped_missing_url', { event: eventName });
      return;
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const secret = process.env.N8N_WEBHOOK_SECRET?.trim();
    if (secret) {
      headers.Authorization = `Bearer ${secret}`;
    } else {
      logger.warn('webhook.missing_secret', { event: eventName });
    }

    try {
      await this.http.post(url, { event: eventName, ...payload }, { headers });
    } catch (err) {
      logger.error('webhook.dispatch_failed', {
        event: eventName,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }
}

export default new WebhookService();
