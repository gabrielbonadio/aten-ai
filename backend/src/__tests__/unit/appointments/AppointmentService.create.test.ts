import { Op } from 'sequelize';
import webhookService from '../../../shared/services/WebhookService';
import Appointment from '../../../modules/appointments/models/Appointment';
import appointmentService from '../../../modules/appointments/services/AppointmentService';
import Pet from '../../../modules/pets/models/Pet';
import Tenant from '../../../modules/tenants/models/Tenant';
import Tutor from '../../../modules/tutors/models/Tutor';
import { petTenantA, TENANT_A_ID, tenantA, tutorTenantA } from '../../helpers/fixtures';

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
    findAll: jest.fn()
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

const mockedPet = Pet as jest.Mocked<typeof Pet>;
const mockedAppointment = Appointment as jest.Mocked<typeof Appointment>;
const mockedTenant = Tenant as jest.Mocked<typeof Tenant>;
const mockedWebhook = webhookService as jest.Mocked<typeof webhookService>;

describe('AppointmentService.create (unit)', () => {
  const appointmentDate = new Date('2026-07-15T14:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cria agendamento para pet do mesmo tenant e dispara webhook', async () => {
    const createdAppointment = {
      id: 'appt-uuid-1',
      tenantId: TENANT_A_ID,
      petId: petTenantA.id,
      date: appointmentDate,
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

    const result = await appointmentService.create(
      {
        petId: petTenantA.id,
        date: appointmentDate,
        type: 'CONSULTATION'
      },
      TENANT_A_ID
    );

    expect(mockedPet.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          [Op.and]: [{ id: petTenantA.id }, { tenantId: TENANT_A_ID }]
        }
      })
    );

    expect(mockedAppointment.create).toHaveBeenCalledWith({
      tenantId: TENANT_A_ID,
      petId: petTenantA.id,
      date: appointmentDate,
      type: 'CONSULTATION',
      status: 'SCHEDULED',
      notes: null,
      assignedUserId: null,
      amountCents: null,
      paymentStatus: 'PENDING'
    });

    expect(mockedWebhook.dispatch).toHaveBeenCalledWith(
      'appointment.created',
      expect.objectContaining({
        appointment_id: createdAppointment.id,
        clinic_name: tenantA.name,
        pet_name: petTenantA.name
      })
    );

    expect(result.id).toBe(createdAppointment.id);
  });

  it('falha quando o pet não pertence ao tenant informado', async () => {
    mockedPet.findOne.mockResolvedValue(null);

    await expect(
      appointmentService.create(
        {
          petId: petTenantA.id,
          date: appointmentDate
        },
        999
      )
    ).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/pet não encontrado/i)
    });

    expect(mockedAppointment.create).not.toHaveBeenCalled();
    expect(mockedWebhook.dispatch).not.toHaveBeenCalled();
  });
});
