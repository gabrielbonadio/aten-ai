import request from 'supertest';
import appointmentsRoutes from '../../modules/appointments/routes';
import appointmentService from '../../modules/appointments/services/AppointmentService';
import { bearer, signTestToken, TENANT_A_ID, userTenantA } from '../helpers/fixtures';
import { createTestApp } from '../helpers/createTestApp';

jest.mock('../../modules/appointments/services/AppointmentService', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn()
  }
}));

const mockedAppointmentService = appointmentService as jest.Mocked<typeof appointmentService>;

describe('GET /appointments — filtro assignedUserId=me (contrato)', () => {
  const app = createTestApp(appointmentsRoutes);
  const token = signTestToken({
    id: userTenantA.id,
    role: 'ADMIN',
    tenantId: String(TENANT_A_ID)
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAppointmentService.findAll.mockResolvedValue({ rows: [], count: 0 } as never);
  });

  it('resolve assignedUserId=me para o userId do JWT', async () => {
    await request(app)
      .get('/appointments')
      .query({ assignedUserId: 'me' })
      .set(bearer(token))
      .expect(200);

    expect(mockedAppointmentService.findAll).toHaveBeenCalledWith(
      TENANT_A_ID,
      expect.objectContaining({ assignedUserId: userTenantA.id }),
      expect.any(Object)
    );
  });

  it('repassa UUID explícito de assignedUserId', async () => {
    const otherUserId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

    await request(app)
      .get('/appointments')
      .query({ assignedUserId: otherUserId })
      .set(bearer(token))
      .expect(200);

    expect(mockedAppointmentService.findAll).toHaveBeenCalledWith(
      TENANT_A_ID,
      expect.objectContaining({ assignedUserId: otherUserId }),
      expect.any(Object)
    );
  });
});
