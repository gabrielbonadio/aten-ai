import {
  appointmentStatusLabel,
  confirmationStatusLabel,
  normalizeAppointmentStatus,
  normalizeConfirmationStatus
} from './appointment-display.util';

describe('appointment-display.util (S0/S1)', () => {
  describe('normalizeAppointmentStatus', () => {
    it('mapeia COMPLETED e sinônimos PT', () => {
      expect(normalizeAppointmentStatus('COMPLETED')).toBe('COMPLETED');
      expect(normalizeAppointmentStatus('concluido')).toBe('COMPLETED');
      expect(normalizeAppointmentStatus('CONCLUÍDO')).toBe('COMPLETED');
    });

    it('mapeia CANCELED e sinônimos', () => {
      expect(normalizeAppointmentStatus('CANCELED')).toBe('CANCELED');
      expect(normalizeAppointmentStatus('cancelado')).toBe('CANCELED');
      expect(normalizeAppointmentStatus('CANCELLED')).toBe('CANCELED');
    });

    it('fallback para SCHEDULED', () => {
      expect(normalizeAppointmentStatus(null)).toBe('SCHEDULED');
      expect(normalizeAppointmentStatus('')).toBe('SCHEDULED');
      expect(normalizeAppointmentStatus('foo')).toBe('SCHEDULED');
    });
  });

  describe('appointmentStatusLabel', () => {
    it('rótulos em PT', () => {
      expect(appointmentStatusLabel('COMPLETED')).toBe('Concluído');
      expect(appointmentStatusLabel('CANCELED')).toBe('Cancelado');
      expect(appointmentStatusLabel('SCHEDULED')).toBe('Agendado');
    });
  });

  describe('normalizeConfirmationStatus', () => {
    it('mapeia CONFIRMED / PENDING / RESCHEDULED', () => {
      expect(normalizeConfirmationStatus('CONFIRMED')).toBe('CONFIRMED');
      expect(normalizeConfirmationStatus('confirmado')).toBe('CONFIRMED');
      expect(normalizeConfirmationStatus('PENDING')).toBe('PENDING');
      expect(normalizeConfirmationStatus('pendente')).toBe('PENDING');
      expect(normalizeConfirmationStatus('RESCHEDULED')).toBe('RESCHEDULED');
      expect(normalizeConfirmationStatus('reagendado')).toBe('RESCHEDULED');
    });

    it('retorna null quando ausente ou desconhecido', () => {
      expect(normalizeConfirmationStatus(null)).toBeNull();
      expect(normalizeConfirmationStatus('')).toBeNull();
      expect(normalizeConfirmationStatus('X')).toBeNull();
    });
  });

  describe('confirmationStatusLabel', () => {
    it('rótulos WhatsApp em PT', () => {
      expect(confirmationStatusLabel('CONFIRMED')).toBe('Confirmado');
      expect(confirmationStatusLabel('PENDING')).toBe('Pendente');
      expect(confirmationStatusLabel('RESCHEDULED')).toBe('Reagendado');
      expect(confirmationStatusLabel(null)).toBeNull();
    });
  });
});
