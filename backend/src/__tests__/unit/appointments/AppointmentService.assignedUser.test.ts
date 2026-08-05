import { Op } from 'sequelize';
import Appointment from '../../../modules/appointments/models/Appointment';
import appointmentService from '../../../modules/appointments/services/AppointmentService';
import userRepository from '../../../modules/auth/repositories/UserRepository';
import Pet from '../../../modules/pets/models/Pet';
import Tenant from '../../../modules/tenants/models/Tenant';
import {
  petTenantA,
  TENANT_A_ID,
  TENANT_B_ID,
  tutorTenantA,
  userTenantA,
  userTenantB
} from '../../helpers/fixtures';

jest.mock('../../../modules/pets/models/Pet', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn()
  }
}));

jest.mock('../../../modules/appointments/models/Appointment', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn()
  }
}));

jest.mock('../../../modules/tenants/models/Tenant', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn()
  }
}));

jest.mock('../../../modules/tutors/models/Tutor', () => ({
  __esModule: true,
  default: {}
}));

jest.mock('../../../modules/auth/repositories/UserRepository', () => ({
  __esModule: true,
  default: {
    findByIdAndTenant: jest.fn()
  }
}));

const mockedPet = Pet as jest.Mocked<typeof Pet>;
const mockedAppointment = Appointment as jest.Mocked<typeof Appointment>;
const mockedTenant = Tenant as jest.Mocked<typeof Tenant>;
const mockedUserRepository = userRepository as jest.Mocked<typeof userRepository>;

describe('AppointmentService — assignedUserId multi-tenant (unit)', () => {
  const appointmentDate = new Date('2026-08-12T14:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('aceita assignedUserId do mesmo tenant', async () => {
      mockedPet.findOne.mockResolvedValue({
        ...petTenantA,
        tutor: tutorTenantA
      } as never);
      mockedUserRepository.findByIdAndTenant.mockResolvedValue(userTenantA as never);
      mockedAppointment.create.mockResolvedValue({
        id: 'appt-assigned-1',
        tenantId: TENANT_A_ID,
        assignedUserId: userTenantA.id
      } as never);
      mockedTenant.findByPk.mockResolvedValue({ id: TENANT_A_ID, name: 'Clínica' } as never);

      await appointmentService.create(
        {
          petId: petTenantA.id,
          date: appointmentDate,
          assignedUserId: userTenantA.id
        },
        TENANT_A_ID
      );

      expect(mockedUserRepository.findByIdAndTenant).toHaveBeenCalledWith(
        userTenantA.id,
        TENANT_A_ID
      );
      expect(mockedAppointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_A_ID,
          assignedUserId: userTenantA.id
        })
      );
    });

    it('rejeita assignedUserId de outro tenant (404)', async () => {
      mockedPet.findOne.mockResolvedValue({
        ...petTenantA,
        tutor: tutorTenantA
      } as never);
      mockedUserRepository.findByIdAndTenant.mockResolvedValue(null);

      await expect(
        appointmentService.create(
          {
            petId: petTenantA.id,
            date: appointmentDate,
            assignedUserId: userTenantB.id
          },
          TENANT_A_ID
        )
      ).rejects.toMatchObject({
        statusCode: 404,
        message: expect.stringMatching(/usuário não encontrado/i)
      });

      expect(mockedUserRepository.findByIdAndTenant).toHaveBeenCalledWith(
        userTenantB.id,
        TENANT_A_ID
      );
      expect(mockedAppointment.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('não permite atribuir profissional de outro tenant', async () => {
      const appointment = {
        id: 'appt-upd-1',
        tenantId: TENANT_A_ID,
        assignedUserId: null,
        update: jest.fn()
      };
      mockedAppointment.findOne.mockResolvedValue(appointment as never);
      mockedUserRepository.findByIdAndTenant.mockResolvedValue(null);

      await expect(
        appointmentService.update('appt-upd-1', TENANT_A_ID, {
          assignedUserId: userTenantB.id
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        message: expect.stringMatching(/usuário não encontrado/i)
      });

      expect(appointment.update).not.toHaveBeenCalled();
    });

    it('permite desatribuir (assignedUserId null)', async () => {
      const appointment = {
        id: 'appt-upd-2',
        tenantId: TENANT_A_ID,
        assignedUserId: userTenantA.id,
        update: jest.fn().mockResolvedValue(undefined)
      };
      mockedAppointment.findOne.mockResolvedValue(appointment as never);

      await appointmentService.update('appt-upd-2', TENANT_A_ID, {
        assignedUserId: null
      });

      expect(mockedUserRepository.findByIdAndTenant).not.toHaveBeenCalled();
      expect(appointment.update).toHaveBeenCalledWith({ assignedUserId: null });
    });
  });

  describe('findAll', () => {
    it('filtra por assignedUserId sempre escopado ao tenantId', async () => {
      mockedAppointment.findAndCountAll.mockResolvedValue({ rows: [], count: 0 } as never);

      await appointmentService.findAll(
        TENANT_A_ID,
        { assignedUserId: userTenantA.id },
        { limit: 50, offset: 0 }
      );

      expect(mockedAppointment.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            [Op.and]: [{ tenantId: TENANT_A_ID }, { assignedUserId: userTenantA.id }]
          }
        })
      );
    });

    it('não cruza tenant ao filtrar por profissional (where inclui tenant B)', async () => {
      mockedAppointment.findAndCountAll.mockResolvedValue({ rows: [], count: 0 } as never);

      await appointmentService.findAll(
        TENANT_B_ID,
        { assignedUserId: userTenantA.id },
        { limit: 50, offset: 0 }
      );

      expect(mockedAppointment.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            [Op.and]: [{ tenantId: TENANT_B_ID }, { assignedUserId: userTenantA.id }]
          }
        })
      );
    });
  });
});
