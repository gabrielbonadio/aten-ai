import { Op } from 'sequelize';
import Appointment from '../../../modules/appointments/models/Appointment';
import dashboardService from '../../../modules/dashboard/services/DashboardService';
import Pet from '../../../modules/pets/models/Pet';
import Tutor from '../../../modules/tutors/models/Tutor';
import { TENANT_A_ID, TENANT_B_ID } from '../../helpers/fixtures';

jest.mock('../../../modules/appointments/models/Appointment', () => ({
  __esModule: true,
  default: {
    count: jest.fn(),
    findAll: jest.fn(),
    sum: jest.fn()
  }
}));

jest.mock('../../../modules/pets/models/Pet', () => ({
  __esModule: true,
  default: {
    count: jest.fn()
  }
}));

jest.mock('../../../modules/tutors/models/Tutor', () => ({
  __esModule: true,
  default: {
    count: jest.fn()
  }
}));

const mockedAppointment = Appointment as jest.Mocked<typeof Appointment>;
const mockedPet = Pet as jest.Mocked<typeof Pet>;
const mockedTutor = Tutor as jest.Mocked<typeof Tutor>;

describe('DashboardService — paidAmountCentsToday (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPet.count.mockResolvedValue(0);
    mockedTutor.count.mockResolvedValue(0);
    mockedAppointment.count.mockResolvedValue(0);
    mockedAppointment.findAll.mockResolvedValue([] as never);
  });

  it('soma amountCents PAID do dia apenas do tenant solicitado', async () => {
    mockedAppointment.sum.mockResolvedValue(25000 as never);

    const metrics = await dashboardService.getMetricsV2(String(TENANT_A_ID));

    expect(metrics.metrics.paidAmountCentsToday).toBe(25000);
    expect(mockedAppointment.sum).toHaveBeenCalledWith(
      'amountCents',
      expect.objectContaining({
        where: {
          [Op.and]: [
            { tenantId: TENANT_A_ID },
            { paymentStatus: 'PAID' },
            { date: { [Op.between]: [expect.any(Date), expect.any(Date)] } }
          ]
        }
      })
    );
  });

  it('retorna 0 quando não há PAID no dia', async () => {
    mockedAppointment.sum.mockResolvedValue(null as never);

    const metrics = await dashboardService.getMetrics(String(TENANT_B_ID));

    expect(metrics.paidAmountCentsToday).toBe(0);
    expect(mockedAppointment.sum).toHaveBeenCalledWith(
      'amountCents',
      expect.objectContaining({
        where: expect.objectContaining({
          [Op.and]: expect.arrayContaining([{ tenantId: TENANT_B_ID }, { paymentStatus: 'PAID' }])
        })
      })
    );
  });
});
