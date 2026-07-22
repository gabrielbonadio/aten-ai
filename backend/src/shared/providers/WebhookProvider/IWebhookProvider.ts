import type { MedicalRecordWebhookPayload } from './medicalRecordWebhook.types';

export interface IWebhookProvider {
  dispatchMedicalRecordCreated(payload: MedicalRecordWebhookPayload): Promise<void>;
}

