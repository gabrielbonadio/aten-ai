import { Op } from 'sequelize';
import Appointment from '../../../modules/appointments/models/Appointment';
import appointmentService from '../../../modules/appointments/services/AppointmentService';
import { TENANT_A_ID, TENANT_B_ID } from '../../helpers/fixtures';

jest.mock('../../../modules/appointments/models/Appointment', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
    findAndCountAll: jest.fn()
  }
}));

jest.mock('../../../modules/pets/models/Pet', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn()
  }
}));

jest.mock('../../../modules/auth/repositories/UserRepository', () => ({
  __esModule: true,
  default: {
    findByIdAndTenant: jest.fn()
  }
}));

const mockedAppointment = Appointment as jest.Mocked<typeof Appointment>;

describe('AppointmentService — payment fields (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('atualiza amountCents e paymentStatus no mesmo tenant', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const appointment = {
      id: 'appt-pay-1',
      tenantId: TENANT_A_ID,
      amountCents: null,
      paymentStatus: 'PENDING',
      update
    };
    mockedAppointment.findOne.mockResolvedValue(appointment as never);

    await appointmentService.update('appt-pay-1', TENANT_A_ID, {
      amountCents: 15000,
      paymentStatus: 'PAID'
    });

    expect(mockedAppointment.findOne).toHaveBeenCalledWith({
      where: { [Op.and]: [{ id: 'appt-pay-1' }, { tenantId: TENANT_A_ID }] }
    });
    expect(update).toHaveBeenCalledWith({
      amountCents: 15000,
      paymentStatus: 'PAID'
    });
  });

  it('não atualiza pagamento de agendamento de outro tenant', async () => {
    mockedAppointment.findOne.mockResolvedValue(null);

    await expect(
      appointmentService.update('appt-other', TENANT_A_ID, {
        paymentStatus: 'PAID',
        amountCents: 1000
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/agendamento não encontrado/i)
    });

    expect(mockedAppointment.findOne).toHaveBeenCalledWith({
      where: { [Op.and]: [{ id: 'appt-other' }, { tenantId: TENANT_A_ID }] }
    });
  });

  it('lista com filtro paymentStatus escopado ao tenant', async () => {
    mockedAppointment.findAndCountAll.mockResolvedValue({ rows: [], count: 0 } as never);

    await appointmentService.findAll(
      TENANT_B_ID,
      { paymentStatus: 'PAID' },
      { limit: 50, offset: 0 }
    );

    expect(mockedAppointment.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          [Op.and]: [{ tenantId: TENANT_B_ID }, { paymentStatus: 'PAID' }]
        }
      })
    );
  });
});
