import type { Pet, PetTutorSummary } from './pet.model';

export type AppointmentType = 'CONSULTATION' | 'VACCINE' | 'SURGERY' | 'OTHER';

/** Status operacional do atendimento (API, inglês). Labels PT só na UI. */
export type AppointmentStatusCode = 'SCHEDULED' | 'COMPLETED' | 'CANCELED';

/** Confirmação via WhatsApp (somente leitura no portal nesta fatia). */
export type AppointmentConfirmationStatus = 'PENDING' | 'CONFIRMED' | 'RESCHEDULED';

/** Caixa mínimo (S7) — sem gateway. */
export type AppointmentPaymentStatus = 'PENDING' | 'PAID' | 'WAIVED';

/** Profissional atribuído (join leve do GET /appointments). */
export interface AppointmentAssignee {
  id: string;
  name: string;
}

export interface Appointment {
  id: string;
  petId: string;
  /** ISO string */
  scheduledAt: string;
  type: AppointmentType | string;
  status?: AppointmentStatusCode | string | null;
  /** Resposta do tutor no WhatsApp; não editável no portal (S1). */
  confirmationStatus?: AppointmentConfirmationStatus | null;
  /** Profissional responsável (S4). */
  assignedUserId?: string | null;
  assignedUser?: AppointmentAssignee | null;
  /** Valor em centavos (S7). */
  amountCents?: number | null;
  /** Situação do pagamento (S7). */
  paymentStatus?: AppointmentPaymentStatus | string | null;

  /** Quando a API retornar joins */
  pet?: (Pick<Pet, 'id' | 'name'> & { tutor?: Pick<PetTutorSummary, 'id' | 'name'> | null }) | null;
  /** Compat legado (preferir `pet.tutor`) */
  tutor?: Pick<PetTutorSummary, 'id' | 'name'> | null;
}

/** Corpo do PATCH /appointments/:id/payment */
export interface UpdateAppointmentPaymentPayload {
  amountCents?: number | null;
  paymentStatus?: AppointmentPaymentStatus;
}

/** Corpo do POST /appointments — tenant vem do token no back-end */
export interface CreateAppointmentPayload {
  petId: string;
  /** ISO string */
  date: string;
  type: AppointmentType;
  /** Opcional; padrão na API é SCHEDULED. */
  status?: AppointmentStatusCode;
  /** Profissional; omitir/null = sem atribuição. */
  assignedUserId?: string | null;
}

/** Corpo do PATCH /appointments/:id/status */
export interface UpdateAppointmentStatusPayload {
  status: AppointmentStatusCode;
}

/** Filtro de lista (query). `me` = utilizador autenticado no BE. */
export type AppointmentAssigneeFilter = 'me' | string;
