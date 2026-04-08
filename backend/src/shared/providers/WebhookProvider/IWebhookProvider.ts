import type { MedicalRecordWebhookPayload } from './medicalRecordWebhook.types';

export interface IWebhookProvider {
  dispatchAppointmentCreated(data: any): Promise<void>;
  dispatchMedicalRecordCreated(payload: MedicalRecordWebhookPayload): Promise<void>;
}

