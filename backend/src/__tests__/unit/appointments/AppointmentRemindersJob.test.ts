import Appointment from '../../../modules/appointments/models/Appointment';
import appointmentRemindersJob from '../../../modules/appointments/jobs/AppointmentRemindersJob';
import conversationStateRepository from '../../../modules/conversations/repositories/ConversationStateRepository';
import webhookService from '../../../shared/services/WebhookService';

jest.mock('../../../modules/appointments/models/Appointment', () => ({
  __esModule: true,
  default: {
    findAll: jest.fn()
  }
}));

jest.mock('../../../modules/conversations/repositories/ConversationStateRepository', () => ({
  __esModule: true,
  default: {
    saveState: jest.fn(),
    getState: jest.fn(),
    clearState: jest.fn(),
    clearExpiredStates: jest.fn()
  }
}));

jest.mock('../../../shared/services/WebhookService', () => ({
  __esModule: true,
  default: {
    dispatch: jest.fn()
  }
}));

const mockedAppointment = Appointment as unknown as { findAll: jest.Mock };
const mockedStates = conversationStateRepository as jest.Mocked<typeof conversationStateRepository>;
const mockedWebhook = webhookService as jest.Mocked<typeof webhookService>;

function buildAppointmentFixture() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(14, 30, 0, 0);

  return {
    id: 'appt-uuid-1',
    tenantId: 1,
    type: 'CONSULTATION',
    date,
    update: jest.fn().mockResolvedValue(undefined),
    tenant: { name: 'Clínica Teste' },
    pet: {
      name: 'Thor',
      species: 'Cão',
      tutor: { name: 'Maria', phone: '11987654321' }
    }
  };
}

describe('AppointmentRemindersJob.runOnce (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('claim → saveState → dispatch no happy path', async () => {
    const appt = buildAppointmentFixture();
    mockedAppointment.findAll.mockResolvedValue([appt]);
    mockedStates.saveState.mockResolvedValue({} as never);

    const result = await appointmentRemindersJob.runOnce();

    expect(result).toEqual({ found: 1, sent: 1, failed: 0 });
    expect(appt.update).toHaveBeenCalledWith({ reminderSentAt: expect.any(Date) });
    expect(mockedStates.saveState).toHaveBeenCalledWith(
      1,
      '+5511987654321',
      'confirm_appointment',
      'appt-uuid-1',
      24
    );
    expect(mockedWebhook.dispatch).toHaveBeenCalledWith(
      'appointment.reminder',
      expect.objectContaining({
        appointment_id: 'appt-uuid-1',
        tutor_phone: '+5511987654321',
        pet_name: 'Thor',
        clinic_name: 'Clínica Teste'
      })
    );
  });

  it('continua o dispatch mesmo se saveState falhar', async () => {
    const appt = buildAppointmentFixture();
    mockedAppointment.findAll.mockResolvedValue([appt]);
    mockedStates.saveState.mockRejectedValue(new Error('MySQL timeout'));

    const result = await appointmentRemindersJob.runOnce();

    expect(result).toEqual({ found: 1, sent: 1, failed: 0 });
    expect(mockedWebhook.dispatch).toHaveBeenCalledTimes(1);
    expect(mockedWebhook.dispatch).toHaveBeenCalledWith(
      'appointment.reminder',
      expect.objectContaining({ appointment_id: 'appt-uuid-1' })
    );
  });

  it('retorna zeros quando não há agendamentos na janela', async () => {
    mockedAppointment.findAll.mockResolvedValue([]);

    const result = await appointmentRemindersJob.runOnce();

    expect(result).toEqual({ found: 0, sent: 0, failed: 0 });
    expect(mockedStates.saveState).not.toHaveBeenCalled();
    expect(mockedWebhook.dispatch).not.toHaveBeenCalled();
  });
});
