import { Op } from 'sequelize';
import Appointment from '../../../modules/appointments/models/Appointment';
import appointmentRepository from '../../../modules/appointments/repositories/AppointmentRepository';

jest.mock('../../../modules/appointments/models/Appointment', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn()
  }
}));

const mockedAppointment = Appointment as jest.Mocked<typeof Appointment>;

describe('AppointmentRepository.updateStatus — RESCHEDULE (unit)', () => {
  const appointmentId = '550e8400-e29b-41d4-a716-446655440000';
  const tenantId = 1;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-05T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('atualiza date + confirmationStatus RESCHEDULED com data futura', async () => {
    const newDate = new Date('2026-08-20T15:00:00.000Z');
    const update = jest.fn().mockResolvedValue(undefined);
    const reload = jest.fn().mockResolvedValue({
      id: appointmentId,
      date: newDate,
      confirmationStatus: 'RESCHEDULED'
    });

    mockedAppointment.findOne.mockResolvedValue({
      id: appointmentId,
      tenantId,
      update,
      reload
    } as never);

    const result = await appointmentRepository.updateStatus(appointmentId, tenantId, 'RESCHEDULE', {
      newDate
    });

    expect(mockedAppointment.findOne).toHaveBeenCalledWith({
      where: { [Op.and]: [{ id: appointmentId }, { tenantId }] }
    });
    expect(update).toHaveBeenCalledWith({
      date: newDate,
      confirmationStatus: 'RESCHEDULED'
    });
    expect(result.confirmationStatus).toBe('RESCHEDULED');
  });

  it('rejeita data no passado', async () => {
    const update = jest.fn();
    mockedAppointment.findOne.mockResolvedValue({
      id: appointmentId,
      tenantId,
      update,
      reload: jest.fn()
    } as never);

    await expect(
      appointmentRepository.updateStatus(appointmentId, tenantId, 'RESCHEDULE', {
        newDate: new Date('2026-08-01T10:00:00.000Z')
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/futura/i)
    });

    expect(update).not.toHaveBeenCalled();
  });
});
