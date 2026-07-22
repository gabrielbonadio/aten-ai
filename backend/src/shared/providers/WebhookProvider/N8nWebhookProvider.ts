import axios, { type AxiosInstance } from 'axios';
import type { IWebhookProvider } from './IWebhookProvider';
import type { MedicalRecordWebhookPayload } from './medicalRecordWebhook.types';

export class N8nWebhookProvider implements IWebhookProvider {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create();
  }

  async dispatchMedicalRecordCreated(payload: MedicalRecordWebhookPayload): Promise<void> {
    const url = process.env.N8N_MEDICAL_RECORD_WEBHOOK_URL?.trim();
    if (!url) {
      console.error('[Webhook] N8N_MEDICAL_RECORD_WEBHOOK_URL não configurado. Prontuário não enviado ao n8n.');
      return;
    }

    const apiKey = process.env.N8N_MEDICAL_RECORD_WEBHOOK_API_KEY?.trim();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    } else {
      console.warn(
        '[Webhook] N8N_MEDICAL_RECORD_WEBHOOK_API_KEY não definido; requisição ao n8n sem cabeçalho x-api-key.'
      );
    }

    try {
      await this.http.post(url, payload, { headers });
      console.log('[Webhook] MedicalRecordCreated enviado para n8n com sucesso.');
    } catch (err) {
      console.error('[Webhook] Falha ao enviar MedicalRecordCreated para n8n:', err);
    }
  }
}

