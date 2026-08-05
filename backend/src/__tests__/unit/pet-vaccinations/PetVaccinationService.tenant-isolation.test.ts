import { Op } from 'sequelize';
import PetVaccination from '../../../modules/pet-vaccinations/models/PetVaccination';
import petVaccinationService from '../../../modules/pet-vaccinations/services/PetVaccinationService';
import Pet from '../../../modules/pets/models/Pet';
import { petTenantA, petTenantB, TENANT_A_ID, TENANT_B_ID } from '../../helpers/fixtures';

jest.mock('../../../modules/pets/models/Pet', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn()
  }
}));

jest.mock('../../../modules/pet-vaccinations/models/PetVaccination', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    destroy: jest.fn()
  }
}));

const mockedPet = Pet as jest.Mocked<typeof Pet>;
const mockedVaccination = PetVaccination as jest.Mocked<typeof PetVaccination>;

describe('PetVaccinationService — isolamento multi-tenant (unit)', () => {
  const nextDueAt = new Date('2026-09-01T12:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('não cria vacinação para pet de outro tenant', async () => {
    mockedPet.findOne.mockResolvedValue(null);

    await expect(
      petVaccinationService.create(
        {
          petId: petTenantB.id,
          name: 'V10',
          nextDueAt
        },
        TENANT_A_ID
      )
    ).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/pet não encontrado/i)
    });

    expect(mockedPet.findOne).toHaveBeenCalledWith({
      where: { [Op.and]: [{ id: petTenantB.id }, { tenantId: TENANT_A_ID }] }
    });
    expect(mockedVaccination.create).not.toHaveBeenCalled();
  });

  it('cria vacinação apenas quando o pet pertence ao tenant', async () => {
    mockedPet.findOne.mockResolvedValue(petTenantA as never);
    mockedVaccination.create.mockResolvedValue({
      id: 'vacc-1',
      tenantId: TENANT_A_ID,
      petId: petTenantA.id,
      name: 'V10'
    } as never);

    await petVaccinationService.create(
      {
        petId: petTenantA.id,
        name: 'V10',
        nextDueAt
      },
      TENANT_A_ID
    );

    expect(mockedVaccination.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_A_ID,
        petId: petTenantA.id,
        name: 'V10',
        reminderSentAt: null
      })
    );
  });

  it('findById não vaza registro de outro tenant', async () => {
    mockedVaccination.findOne.mockResolvedValue(null);

    await expect(petVaccinationService.findById('vacc-other', TENANT_A_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/vacinação não encontrada/i)
    });

    expect(mockedVaccination.findOne).toHaveBeenCalledWith({
      where: { [Op.and]: [{ id: 'vacc-other' }, { tenantId: TENANT_A_ID }] }
    });
  });

  it('list escopa por tenantId (e petId opcional)', async () => {
    mockedVaccination.findAndCountAll.mockResolvedValue({ rows: [], count: 0 } as never);

    await petVaccinationService.findAll(
      TENANT_B_ID,
      { petId: petTenantB.id },
      { limit: 50, offset: 0 }
    );

    expect(mockedVaccination.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          [Op.and]: [{ tenantId: TENANT_B_ID }, { petId: petTenantB.id }]
        }
      })
    );
  });

  it('delete só remove no tenant autenticado', async () => {
    mockedVaccination.destroy.mockResolvedValue(0);

    await expect(petVaccinationService.remove('vacc-1', TENANT_A_ID)).rejects.toMatchObject({
      statusCode: 404
    });

    expect(mockedVaccination.destroy).toHaveBeenCalledWith({
      where: { [Op.and]: [{ id: 'vacc-1' }, { tenantId: TENANT_A_ID }] }
    });
  });
});
