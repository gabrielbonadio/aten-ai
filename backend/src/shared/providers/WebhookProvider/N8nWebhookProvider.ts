import axios, { type AxiosInstance } from 'axios';
import { logger } from '../../logging/logger';
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
      logger.error('webhook.medical_record.missing_url');
      return;
    }

    const apiKey = process.env.N8N_MEDICAL_RECORD_WEBHOOK_API_KEY?.trim();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    } else {
      logger.warn('webhook.medical_record.missing_api_key');
    }

    try {
      await this.http.post(url, payload, { headers });
      logger.info('webhook.medical_record.sent');
    } catch (err) {
      logger.error('webhook.medical_record.failed', {
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }
}
