import PetVaccination from '../../../modules/pet-vaccinations/models/PetVaccination';
import vaccineRemindersJob from '../../../modules/pet-vaccinations/jobs/VaccineRemindersJob';
import webhookService from '../../../shared/services/WebhookService';

jest.mock('../../../modules/pet-vaccinations/models/PetVaccination', () => ({
  __esModule: true,
  default: {
    findAll: jest.fn()
  }
}));

jest.mock('../../../shared/services/WebhookService', () => ({
  __esModule: true,
  default: {
    dispatch: jest.fn()
  }
}));

const mockedVaccination = PetVaccination as unknown as { findAll: jest.Mock };
const mockedWebhook = webhookService as jest.Mocked<typeof webhookService>;

function buildVaccinationFixture() {
  const nextDueAt = new Date();
  nextDueAt.setDate(nextDueAt.getDate() + 1);
  nextDueAt.setHours(9, 0, 0, 0);

  return {
    id: 'vacc-uuid-1',
    tenantId: 1,
    name: 'V10',
    appliedAt: new Date('2025-08-10T14:00:00.000Z'),
    nextDueAt,
    reminderSentAt: null,
    update: jest.fn().mockResolvedValue(undefined),
    tenant: { name: 'Clínica Teste' },
    pet: {
      name: 'Thor',
      species: 'Cão',
      tutor: { name: 'Maria', phone: '11987654321' }
    }
  };
}

describe('VaccineRemindersJob.runOnce (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('claim-first reminderSentAt e depois dispatch vaccine.reminder', async () => {
    const row = buildVaccinationFixture();
    mockedVaccination.findAll.mockResolvedValue([row]);

    const result = await vaccineRemindersJob.runOnce();

    expect(result).toEqual({ found: 1, sent: 1, failed: 0 });
    expect(row.update).toHaveBeenCalledWith({ reminderSentAt: expect.any(Date) });
    expect(mockedWebhook.dispatch).toHaveBeenCalledWith(
      'vaccine.reminder',
      expect.objectContaining({
        vaccination_id: 'vacc-uuid-1',
        tenant_id: 1,
        clinic_name: 'Clínica Teste',
        tutor_phone: '+5511987654321',
        pet_name: 'Thor',
        vaccine_name: 'V10',
        next_due_datetime_iso: row.nextDueAt.toISOString()
      })
    );

    const claimOrder = row.update.mock.invocationCallOrder[0];
    const dispatchOrder = (mockedWebhook.dispatch as jest.Mock).mock.invocationCallOrder[0];
    expect(claimOrder).toBeLessThan(dispatchOrder);
  });

  it('retorna zeros quando não há vacinações na janela D-1', async () => {
    mockedVaccination.findAll.mockResolvedValue([]);

    const result = await vaccineRemindersJob.runOnce();

    expect(result).toEqual({ found: 0, sent: 0, failed: 0 });
    expect(mockedWebhook.dispatch).not.toHaveBeenCalled();
  });

  it('falha de um item não impede os demais', async () => {
    const ok = buildVaccinationFixture();
    const bad = {
      ...buildVaccinationFixture(),
      id: 'vacc-uuid-bad',
      update: jest.fn().mockRejectedValue(new Error('DB lock'))
    };
    mockedVaccination.findAll.mockResolvedValue([bad, ok]);

    const result = await vaccineRemindersJob.runOnce();

    expect(result).toEqual({ found: 2, sent: 1, failed: 1 });
    expect(mockedWebhook.dispatch).toHaveBeenCalledTimes(1);
    expect(mockedWebhook.dispatch).toHaveBeenCalledWith(
      'vaccine.reminder',
      expect.objectContaining({ vaccination_id: 'vacc-uuid-1' })
    );
  });
});
