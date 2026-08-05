import type {
  AppointmentConfirmationStatus,
  AppointmentStatusCode
} from '../models/appointment.model';

/** Normaliza status de agendamento vindo da API (PT/EN). */
export function normalizeAppointmentStatus(
  apiStatus: string | null | undefined
): AppointmentStatusCode {
  const s = (apiStatus ?? '').trim().toUpperCase();
  if (s === 'COMPLETED' || s === 'CONCLUIDO' || s === 'CONCLUÍDO') return 'COMPLETED';
  if (s === 'CANCELED' || s === 'CANCELADO' || s === 'CANCELLED') return 'CANCELED';
  return 'SCHEDULED';
}

export function appointmentStatusLabel(code: AppointmentStatusCode): string {
  if (code === 'COMPLETED') return 'Concluído';
  if (code === 'CANCELED') return 'Cancelado';
  return 'Agendado';
}

/** Normaliza confirmação WhatsApp (S1). */
export function normalizeConfirmationStatus(
  value: AppointmentConfirmationStatus | string | null | undefined
): AppointmentConfirmationStatus | null {
  if (value == null || value === '') return null;
  const s = String(value).trim().toUpperCase();
  if (s === 'CONFIRMED' || s === 'CONFIRMADO') return 'CONFIRMED';
  if (s === 'RESCHEDULED' || s === 'REAGENDADO') return 'RESCHEDULED';
  if (s === 'PENDING' || s === 'PENDENTE') return 'PENDING';
  return null;
}

export function confirmationStatusLabel(
  code: AppointmentConfirmationStatus | null
): string | null {
  if (code === 'CONFIRMED') return 'Confirmado';
  if (code === 'PENDING') return 'Pendente';
  if (code === 'RESCHEDULED') return 'Remarcado';
  return null;
}
