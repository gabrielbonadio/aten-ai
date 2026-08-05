import { Op } from 'sequelize';
import Appointment from '../../../modules/appointments/models/Appointment';
import appointmentService from '../../../modules/appointments/services/AppointmentService';
import { TENANT_A_ID, TENANT_B_ID } from '../../helpers/fixtures';

jest.mock('../../../modules/appointments/models/Appointment', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn()
  }
}));

const mockedAppointment = Appointment as jest.Mocked<typeof Appointment>;

describe('AppointmentService.updateStatus (unit)', () => {
  const appointmentId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('atualiza status quando o agendamento pertence ao tenant (happy path)', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const appointment = {
      id: appointmentId,
      tenantId: TENANT_A_ID,
      status: 'SCHEDULED',
      update
    };

    mockedAppointment.findOne.mockResolvedValue(appointment as never);

    const result = await appointmentService.updateStatus(appointmentId, TENANT_A_ID, 'COMPLETED');

    expect(mockedAppointment.findOne).toHaveBeenCalledWith({
      where: { [Op.and]: [{ id: appointmentId }, { tenantId: TENANT_A_ID }] }
    });
    expect(update).toHaveBeenCalledWith({ status: 'COMPLETED' });
    expect(result).toBe(appointment);
  });

  it('retorna 404 quando o agendamento é de outro tenant', async () => {
    mockedAppointment.findOne.mockResolvedValue(null);

    await expect(
      appointmentService.updateStatus(appointmentId, TENANT_A_ID, 'COMPLETED')
    ).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/agendamento não encontrado/i)
    });

    expect(mockedAppointment.findOne).toHaveBeenCalledWith({
      where: { [Op.and]: [{ id: appointmentId }, { tenantId: TENANT_A_ID }] }
    });
  });

  it('é idempotente quando o status já é o solicitado', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const appointment = {
      id: appointmentId,
      tenantId: TENANT_B_ID,
      status: 'COMPLETED',
      update
    };

    mockedAppointment.findOne.mockResolvedValue(appointment as never);

    const result = await appointmentService.updateStatus(appointmentId, TENANT_B_ID, 'COMPLETED');

    expect(update).not.toHaveBeenCalled();
    expect(result.status).toBe('COMPLETED');
  });
});
