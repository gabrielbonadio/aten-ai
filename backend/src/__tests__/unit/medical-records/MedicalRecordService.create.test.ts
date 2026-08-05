import { Op } from 'sequelize';
import Appointment from '../../../modules/appointments/models/Appointment';
import appointmentService from '../../../modules/appointments/services/AppointmentService';
import MedicalRecord from '../../../modules/medical-records/models/MedicalRecord';
import medicalRecordService from '../../../modules/medical-records/services/MedicalRecordService';
import Pet from '../../../modules/pets/models/Pet';
import Tenant from '../../../modules/tenants/models/Tenant';
import {
  petTenantA,
  TENANT_A_ID,
  tenantA,
  tutorTenantA,
  userTenantA
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
    findOne: jest.fn()
  }
}));

jest.mock('../../../modules/appointments/services/AppointmentService', () => ({
  __esModule: true,
  default: {
    updateStatus: jest.fn()
  }
}));

jest.mock('../../../modules/medical-records/models/MedicalRecord', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    destroy: jest.fn()
  }
}));

jest.mock('../../../modules/tenants/models/Tenant', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn()
  }
}));

const mockedPet = Pet as jest.Mocked<typeof Pet>;
const mockedAppointment = Appointment as jest.Mocked<typeof Appointment>;
const mockedMedicalRecord = MedicalRecord as jest.Mocked<typeof MedicalRecord>;
const mockedTenant = Tenant as jest.Mocked<typeof Tenant>;
const mockedAppointmentService = appointmentService as jest.Mocked<typeof appointmentService>;

describe('MedicalRecordService.create (unit)', () => {
  const appointmentId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ao criar prontuário com appointmentId, marca o agendamento como COMPLETED', async () => {
    mockedPet.findOne.mockResolvedValue({
      ...petTenantA,
      tutor: tutorTenantA
    } as never);

    mockedAppointment.findOne.mockResolvedValue({
      id: appointmentId,
      tenantId: TENANT_A_ID,
      petId: petTenantA.id,
      status: 'SCHEDULED'
    } as never);

    const createdRecord = {
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      tenantId: TENANT_A_ID,
      petId: petTenantA.id,
      appointmentId,
      veterinarianId: userTenantA.id,
      symptoms: 'Tosse',
      diagnosis: 'Resfriado',
      prescription: null,
      weight: null
    };

    mockedMedicalRecord.create.mockResolvedValue(createdRecord as never);
    mockedAppointmentService.updateStatus.mockResolvedValue({
      id: appointmentId,
      status: 'COMPLETED'
    } as never);
    mockedTenant.findByPk.mockResolvedValue(tenantA as never);

    const result = await medicalRecordService.create(
      {
        petId: petTenantA.id,
        appointmentId,
        symptoms: 'Tosse',
        diagnosis: 'Resfriado'
      },
      TENANT_A_ID,
      userTenantA.id
    );

    expect(mockedAppointment.findOne).toHaveBeenCalledWith({
      where: { [Op.and]: [{ id: appointmentId }, { tenantId: TENANT_A_ID }] }
    });

    expect(mockedMedicalRecord.create).toHaveBeenCalled();

    expect(mockedAppointmentService.updateStatus).toHaveBeenCalledWith(
      appointmentId,
      TENANT_A_ID,
      'COMPLETED'
    );

    expect(result.id).toBe(createdRecord.id);
  });

  it('não chama updateStatus quando create não informa appointmentId', async () => {
    mockedPet.findOne.mockResolvedValue({
      ...petTenantA,
      tutor: tutorTenantA
    } as never);

    mockedMedicalRecord.create.mockResolvedValue({
      id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      tenantId: TENANT_A_ID,
      petId: petTenantA.id,
      appointmentId: null
    } as never);
    mockedTenant.findByPk.mockResolvedValue(tenantA as never);

    await medicalRecordService.create(
      {
        petId: petTenantA.id,
        symptoms: 'Tosse',
        diagnosis: 'Resfriado'
      },
      TENANT_A_ID,
      userTenantA.id
    );

    expect(mockedAppointment.findOne).not.toHaveBeenCalled();
    expect(mockedAppointmentService.updateStatus).not.toHaveBeenCalled();
  });
});
