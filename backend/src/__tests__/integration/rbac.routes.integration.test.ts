import request from 'supertest';
import appointmentsRoutes from '../../modules/appointments/routes';
import dashboardRoutes from '../../modules/dashboard/routes';
import medicalRecordsRoutes from '../../modules/medical-records/routes';
import petsRoutes from '../../modules/pets/routes';
import settingsRoutes from '../../modules/settings/routes';
import tutorsRoutes from '../../modules/tutors/routes';
import usersRoutes from '../../modules/users/routes';
import appointmentService from '../../modules/appointments/services/AppointmentService';
import dashboardService from '../../modules/dashboard/services/DashboardService';
import medicalRecordService from '../../modules/medical-records/services/MedicalRecordService';
import petService from '../../modules/pets/services/PetService';
import tenantService from '../../modules/tenants/services/TenantService';
import tutorService from '../../modules/tutors/services/TutorService';
import userService from '../../modules/users/services/UserService';
import { bearer, signTestToken, TENANT_A_ID } from '../helpers/fixtures';
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

jest.mock('../../modules/tutors/services/TutorService', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
  }
}));

jest.mock('../../modules/pets/services/PetService', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

jest.mock('../../modules/medical-records/services/MedicalRecordService', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByPetId: jest.fn()
  }
}));

jest.mock('../../modules/tenants/services/TenantService', () => ({
  __esModule: true,
  default: {
    getSettingsByTenantId: jest.fn(),
    updateSettingsByTenantId: jest.fn()
  }
}));

jest.mock('../../modules/dashboard/services/DashboardService', () => ({
  __esModule: true,
  default: {
    getMetrics: jest.fn(),
    getMetricsV2: jest.fn()
  }
}));

jest.mock('../../modules/users/services/UserService', () => ({
  __esModule: true,
  default: {
    invite: jest.fn(),
    listByTenant: jest.fn(),
    update: jest.fn()
  }
}));

const mockedAppointments = appointmentService as jest.Mocked<typeof appointmentService>;
const mockedTutors = tutorService as jest.Mocked<typeof tutorService>;
const mockedPets = petService as jest.Mocked<typeof petService>;
const mockedRecords = medicalRecordService as jest.Mocked<typeof medicalRecordService>;
const mockedTenants = tenantService as jest.Mocked<typeof tenantService>;
const mockedDashboard = dashboardService as jest.Mocked<typeof dashboardService>;
const mockedUsers = userService as jest.Mocked<typeof userService>;

const UUID = {
  tutor: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  pet: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  appointment: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  record: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  user: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
};

describe('RBAC S3 — MEMBER vs ADMIN (rotas)', () => {
  const app = createTestApp(
    appointmentsRoutes,
    tutorsRoutes,
    petsRoutes,
    medicalRecordsRoutes,
    settingsRoutes,
    dashboardRoutes,
    usersRoutes
  );

  const memberToken = signTestToken({
    id: 'member-id',
    role: 'MEMBER',
    tenantId: String(TENANT_A_ID)
  });
  const adminToken = signTestToken({
    id: 'admin-id',
    role: 'ADMIN',
    tenantId: String(TENANT_A_ID)
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockedAppointments.create.mockResolvedValue({ id: UUID.appointment } as never);
    mockedAppointments.findAll.mockResolvedValue({ rows: [], count: 0 } as never);
    mockedAppointments.remove.mockResolvedValue(undefined);

    mockedTutors.create.mockResolvedValue({ id: UUID.tutor } as never);
    mockedTutors.findAll.mockResolvedValue({ rows: [], count: 0 } as never);
    mockedTutors.remove.mockResolvedValue(undefined);

    mockedPets.create.mockResolvedValue({ id: UUID.pet } as never);
    mockedPets.findAll.mockResolvedValue({ rows: [], count: 0 } as never);
    mockedPets.delete.mockResolvedValue(undefined);

    mockedRecords.create.mockResolvedValue({ id: UUID.record } as never);
    mockedRecords.delete.mockResolvedValue(undefined);

    mockedTenants.getSettingsByTenantId.mockResolvedValue({ id: TENANT_A_ID, name: 'Clínica' } as never);
    mockedTenants.updateSettingsByTenantId.mockResolvedValue({ id: TENANT_A_ID } as never);

    mockedDashboard.getMetrics.mockResolvedValue({ totalPets: 0 } as never);
    mockedDashboard.getMetricsV2.mockResolvedValue({ totalPets: 0 } as never);

    mockedUsers.invite.mockResolvedValue({ id: UUID.user } as never);
    mockedUsers.listByTenant.mockResolvedValue([]);
  });

  describe('MEMBER — 403 em rotas sensíveis', () => {
    it.each([
      ['DELETE', `/tutors/${UUID.tutor}`],
      ['DELETE', `/pets/${UUID.pet}`],
      ['DELETE', `/medical-records/${UUID.record}`],
      ['PUT', '/settings'],
      ['POST', '/users/invites'],
      ['GET', '/users'],
      ['PATCH', `/users/${UUID.user}`],
      ['GET', '/dashboard'],
      ['GET', '/dashboard/metrics']
    ] as const)('%s %s → 403', async (method, path) => {
      const req = request(app)[method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete'](path).set(
        bearer(memberToken)
      );

      if (method === 'POST' && path === '/users/invites') {
        await req.send({ email: 'x@tenant-a.com' }).expect(403);
      } else if (method === 'PUT' && path === '/settings') {
        await req.send({ name: 'Nova Clínica' }).expect(403);
      } else if (method === 'PATCH') {
        await req.send({ active: false }).expect(403);
      } else {
        await req.expect(403);
      }
    });

    it('não chama services destrutivos quando MEMBER é bloqueado', async () => {
      await request(app).delete(`/pets/${UUID.pet}`).set(bearer(memberToken)).expect(403);
      await request(app).delete(`/tutors/${UUID.tutor}`).set(bearer(memberToken)).expect(403);
      await request(app).delete(`/medical-records/${UUID.record}`).set(bearer(memberToken)).expect(403);

      expect(mockedPets.delete).not.toHaveBeenCalled();
      expect(mockedTutors.remove).not.toHaveBeenCalled();
      expect(mockedRecords.delete).not.toHaveBeenCalled();
    });
  });

  describe('MEMBER — 200/201 na operação diária', () => {
    it('POST /appointments → 201', async () => {
      await request(app)
        .post('/appointments')
        .set(bearer(memberToken))
        .send({ petId: UUID.pet, date: '2026-08-10T14:00:00.000Z' })
        .expect(201);

      expect(mockedAppointments.create).toHaveBeenCalled();
    });

    it('GET /appointments → 200', async () => {
      await request(app).get('/appointments').set(bearer(memberToken)).expect(200);
      expect(mockedAppointments.findAll).toHaveBeenCalled();
    });

    it('DELETE /appointments/:id → 204 (CRUD agenda)', async () => {
      await request(app).delete(`/appointments/${UUID.appointment}`).set(bearer(memberToken)).expect(204);
      expect(mockedAppointments.remove).toHaveBeenCalled();
    });

    it('POST /tutors → 201', async () => {
      await request(app)
        .post('/tutors')
        .set(bearer(memberToken))
        .send({ name: 'Tutor MEMBER', phone: '11999990000' })
        .expect(201);

      expect(mockedTutors.create).toHaveBeenCalled();
    });

    it('GET /tutors → 200', async () => {
      await request(app).get('/tutors').set(bearer(memberToken)).expect(200);
      expect(mockedTutors.findAll).toHaveBeenCalled();
    });

    it('POST /pets → 201', async () => {
      await request(app)
        .post('/pets')
        .set(bearer(memberToken))
        .send({ tutorId: UUID.tutor, name: 'Thor' })
        .expect(201);

      expect(mockedPets.create).toHaveBeenCalled();
    });

    it('POST /medical-records → 201', async () => {
      await request(app)
        .post('/medical-records')
        .set(bearer(memberToken))
        .send({ petId: UUID.pet, symptoms: 'Tosse', diagnosis: 'Resfriado' })
        .expect(201);

      expect(mockedRecords.create).toHaveBeenCalled();
    });

    it('GET /settings → 200', async () => {
      await request(app).get('/settings').set(bearer(memberToken)).expect(200);
      expect(mockedTenants.getSettingsByTenantId).toHaveBeenCalled();
    });
  });

  describe('ADMIN — acessa sensíveis', () => {
    it('DELETE /pets/:id → 204', async () => {
      await request(app).delete(`/pets/${UUID.pet}`).set(bearer(adminToken)).expect(204);
      expect(mockedPets.delete).toHaveBeenCalled();
    });

    it('POST /users/invites → 201', async () => {
      await request(app)
        .post('/users/invites')
        .set(bearer(adminToken))
        .send({ email: 'novo@tenant-a.com' })
        .expect(201);

      expect(mockedUsers.invite).toHaveBeenCalled();
    });
  });
});
