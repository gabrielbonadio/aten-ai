export interface IWebhookProvider {
  dispatchAppointmentCreated(data: any): Promise<void>;
}

