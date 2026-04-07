import axios, { type AxiosInstance } from 'axios';
import type { IWebhookProvider } from './IWebhookProvider';

export class N8nWebhookProvider implements IWebhookProvider {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create();
  }

  async dispatchAppointmentCreated(data: any): Promise<void> {
    const url = process.env.N8N_WEBHOOK_URL;
    if (!url) {
      console.error('[Webhook] N8N_WEBHOOK_URL não configurado. Evento não enviado.');
      return;
    }

    try {
      await this.http.post(url, data);
      console.log('[Webhook] AppointmentCreated enviado para n8n com sucesso.');
    } catch (err) {
      console.error('[Webhook] Falha ao enviar AppointmentCreated para n8n:', err);
    }
  }
}

