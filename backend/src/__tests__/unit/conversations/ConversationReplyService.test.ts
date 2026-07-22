import appointmentRepository from '../../../modules/appointments/repositories/AppointmentRepository';
import conversationStateRepository from '../../../modules/conversations/repositories/ConversationStateRepository';
import conversationReplyService from '../../../modules/conversations/services/ConversationReplyService';

jest.mock('../../../modules/conversations/repositories/ConversationStateRepository', () => ({
  __esModule: true,
  default: {
    getState: jest.fn(),
    clearState: jest.fn(),
    saveState: jest.fn(),
    clearExpiredStates: jest.fn()
  }
}));

jest.mock('../../../modules/appointments/repositories/AppointmentRepository', () => ({
  __esModule: true,
  default: {
    updateStatus: jest.fn()
  }
}));

const mockedStates = conversationStateRepository as jest.Mocked<typeof conversationStateRepository>;
const mockedAppointments = appointmentRepository as jest.Mocked<typeof appointmentRepository>;

describe('ConversationReplyService.processReply (unit)', () => {
  const tenantId = 1;
  const phone = '+5511987654321';
  const appointmentId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('confirma agendamento e limpa o estado quando intent bate', async () => {
    mockedStates.getState.mockResolvedValue({
      expectedIntent: 'confirm_appointment',
      referenceId: appointmentId
    } as never);
    mockedAppointments.updateStatus.mockResolvedValue({ id: appointmentId } as never);
    mockedStates.clearState.mockResolvedValue(1);

    await conversationReplyService.processReply(tenantId, phone, 'confirm_appointment', 'CONFIRMED');

    expect(mockedStates.getState).toHaveBeenCalledWith(tenantId, phone);
    expect(mockedAppointments.updateStatus).toHaveBeenCalledWith(appointmentId, tenantId, 'CONFIRMED');
    expect(mockedStates.clearState).toHaveBeenCalledWith(tenantId, phone);
  });

  it('lança BadRequestError quando a sessão não existe ou expirou', async () => {
    mockedStates.getState.mockResolvedValue(null);

    await expect(
      conversationReplyService.processReply(tenantId, phone, 'confirm_appointment', 'CONFIRMED')
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/Sessão expirada ou não encontrada/i)
    });

    expect(mockedAppointments.updateStatus).not.toHaveBeenCalled();
    expect(mockedStates.clearState).not.toHaveBeenCalled();
  });

  it('lança BadRequestError em desvio de intent e não muta agendamento', async () => {
    mockedStates.getState.mockResolvedValue({
      expectedIntent: 'confirm_appointment',
      referenceId: appointmentId
    } as never);

    await expect(
      conversationReplyService.processReply(tenantId, phone, 'cancel_appointment', 'CANCELED')
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/Desvio de fluxo/i)
    });

    expect(mockedAppointments.updateStatus).not.toHaveBeenCalled();
    expect(mockedStates.clearState).not.toHaveBeenCalled();
  });
});
