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

const mockedService = appointmentService as jest.Mocked<typeof appointmentService>;

describe('PATCH /appointments/:id/payment (contrato FE S7)', () => {
  const app = createTestApp(appointmentsRoutes);
  const token = signTestToken({
    id: userTenantA.id,
    role: 'ADMIN',
    tenantId: String(TENANT_A_ID)
  });
  const appointmentId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marca como PAGO com amountCents', async () => {
    mockedService.update.mockResolvedValue({
      id: appointmentId,
      amountCents: 10000,
      paymentStatus: 'PAID'
    } as never);

    const response = await request(app)
      .patch(`/appointments/${appointmentId}/payment`)
      .set(bearer(token))
      .send({ amountCents: 10000, paymentStatus: 'PAID' })
      .expect(200);

    expect(response.body.paymentStatus).toBe('PAID');
    expect(mockedService.update).toHaveBeenCalledWith(appointmentId, TENANT_A_ID, {
      amountCents: 10000,
      paymentStatus: 'PAID'
    });
  });

  it('aceita só amountCents (salvar valor)', async () => {
    mockedService.update.mockResolvedValue({
      id: appointmentId,
      amountCents: 5000,
      paymentStatus: 'PENDING'
    } as never);

    await request(app)
      .patch(`/appointments/${appointmentId}/payment`)
      .set(bearer(token))
      .send({ amountCents: 5000 })
      .expect(200);

    expect(mockedService.update).toHaveBeenCalledWith(appointmentId, TENANT_A_ID, {
      amountCents: 5000,
      paymentStatus: undefined
    });
  });
});
