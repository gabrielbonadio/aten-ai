/** Payload enviado ao n8n após criação de prontuário (chaves em português para o fluxo). */
export type MedicalRecordWebhookPayload = {
  /** UUID do prontuário (rastreio no n8n). */
  idProntuario: string;
  idTenant: string;
  nomePet: string;
  nomeTutor: string;
  /** Telefone com DDI/DDD (ex.: +5511987654321). */
  telefoneTutor: string;
  prescricao: string | null;
  nomeClinica: string;
};
