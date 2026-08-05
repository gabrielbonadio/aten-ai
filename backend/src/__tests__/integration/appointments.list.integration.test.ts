import request from 'supertest';
import appointmentsRoutes from '../../modules/appointments/routes';
import Appointment from '../../modules/appointments/models/Appointment';
import {
  bearer,
  petTenantA,
  signTestToken,
  TENANT_A_ID,
  tutorTenantA,
  userTenantA
} from '../helpers/fixtures';
import { createTestApp } from '../helpers/createTestApp';

jest.mock('../../modules/appointments/models/Appointment', () => ({
  __esModule: true,
  default: {
    findAndCountAll: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn()
  }
}));

jest.mock('../../modules/pets/models/Pet', () => ({
  __esModule: true,
  default: {}
}));

jest.mock('../../modules/tutors/models/Tutor', () => ({
  __esModule: true,
  default: {}
}));

const mockedAppointment = Appointment as jest.Mocked<typeof Appointment>;

describe('GET /appointments (contrato confirmationStatus)', () => {
  const app = createTestApp(appointmentsRoutes);
  const token = signTestToken({ id: userTenantA.id, tenantId: String(TENANT_A_ID) });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('serializa confirmationStatus em cada item da lista', async () => {
    const row = {
      id: 'appt-list-uuid-1',
      tenantId: TENANT_A_ID,
      petId: petTenantA.id,
      date: new Date('2026-08-10T14:00:00.000Z'),
      type: 'CONSULTATION',
      status: 'SCHEDULED',
      confirmationStatus: 'CONFIRMED',
      notes: null,
      reminderSentAt: null,
      followupSentAt: null,
      pet: {
        ...petTenantA,
        tutor: tutorTenantA
      }
    };

    mockedAppointment.findAndCountAll.mockResolvedValue({
      rows: [row],
      count: 1
    } as never);

    const response = await request(app).get('/appointments').set(bearer(token)).expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toEqual(
      expect.objectContaining({
        id: row.id,
        status: 'SCHEDULED',
        confirmationStatus: 'CONFIRMED'
      })
    );
    expect(response.body.data[0]).toHaveProperty('confirmationStatus');
  });
});
