import type { Pet, PetTutorSummary } from './pet.model';

export type AppointmentType = 'CONSULTATION' | 'VACCINE' | 'SURGERY' | 'OTHER';
export type AppointmentStatus = 'Confirmado' | 'Pendente' | 'Cancelado';

export interface Appointment {
  id: string;
  petId: string;
  /** ISO string */
  scheduledAt: string;
  type: AppointmentType | string;
  status?: AppointmentStatus | string | null;

  /** Quando a API retornar joins */
  pet?: (Pick<Pet, 'id' | 'name'> & { tutor?: Pick<PetTutorSummary, 'id' | 'name'> | null }) | null;
  /** Compat legado (preferir `pet.tutor`) */
  tutor?: Pick<PetTutorSummary, 'id' | 'name'> | null;
}

/** Status persistido na API (inglês). */
export type AppointmentStatusCode = 'SCHEDULED' | 'COMPLETED' | 'CANCELED';

/** Corpo do POST /appointments — tenant vem do token no back-end */
export interface CreateAppointmentPayload {
  petId: string;
  /** ISO string */
  date: string;
  type: AppointmentType;
  /** Opcional; padrão na API é SCHEDULED. */
  status?: AppointmentStatusCode;
}

