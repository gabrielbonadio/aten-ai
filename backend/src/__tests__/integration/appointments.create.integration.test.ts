import request from 'supertest';
import { Op } from 'sequelize';
import appointmentsRoutes from '../../modules/appointments/routes';
import Appointment from '../../modules/appointments/models/Appointment';
import Pet from '../../modules/pets/models/Pet';
import Tenant from '../../modules/tenants/models/Tenant';
import { bearer, petTenantA, signTestToken, TENANT_A_ID, tenantA, tutorTenantA, userTenantA } from '../helpers/fixtures';
import { createTestApp } from '../helpers/createTestApp';

jest.mock('../../modules/pets/models/Pet', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn()
  }
}));

jest.mock('../../modules/appointments/models/Appointment', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn()
  }
}));

jest.mock('../../modules/tenants/models/Tenant', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn()
  }
}));

jest.mock('../../modules/tutors/models/Tutor', () => ({
  __esModule: true,
  default: {}
}));

const mockedPet = Pet as jest.Mocked<typeof Pet>;
const mockedAppointment = Appointment as jest.Mocked<typeof Appointment>;
const mockedTenant = Tenant as jest.Mocked<typeof Tenant>;

describe('POST /appointments (integration)', () => {
  const app = createTestApp(appointmentsRoutes);
  const token = signTestToken({ id: userTenantA.id, tenantId: String(TENANT_A_ID) });
  const appointmentDate = '2026-07-15T14:00:00.000Z';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cria agendamento autenticado e retorna 201', async () => {
    const createdAppointment = {
      id: 'appt-uuid-integration',
      tenantId: TENANT_A_ID,
      petId: petTenantA.id,
      date: new Date(appointmentDate),
      type: 'CONSULTATION',
      status: 'SCHEDULED',
      notes: null
    };

    mockedPet.findOne.mockResolvedValue({
      ...petTenantA,
      tutor: tutorTenantA
    } as never);
    mockedAppointment.create.mockResolvedValue(createdAppointment as never);
    mockedTenant.findByPk.mockResolvedValue(tenantA as never);

    const response = await request(app)
      .post('/appointments')
      .set(bearer(token))
      .send({
        petId: petTenantA.id,
        date: appointmentDate,
        type: 'CONSULTATION',
        notes: 'Primeira consulta'
      })
      .expect(201);

    expect(response.body.id).toBe(createdAppointment.id);
    expect(response.body.tenantId).toBe(TENANT_A_ID);

    expect(mockedPet.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          [Op.and]: [{ id: petTenantA.id }, { tenantId: TENANT_A_ID }]
        }
      })
    );
  });

  it('retorna 404 quando o pet não pertence ao tenant do JWT', async () => {
    mockedPet.findOne.mockResolvedValue(null);

    const response = await request(app)
      .post('/appointments')
      .set(bearer(token))
      .send({
        petId: petTenantA.id,
        date: appointmentDate
      })
      .expect(404);

    expect(response.body.message).toMatch(/pet não encontrado/i);
    expect(mockedAppointment.create).not.toHaveBeenCalled();
  });

  it('retorna 401 sem token de autenticação', async () => {
    await request(app)
      .post('/appointments')
      .send({
        petId: petTenantA.id,
        date: appointmentDate
      })
      .expect(401);

    expect(mockedPet.findOne).not.toHaveBeenCalled();
  });
});
