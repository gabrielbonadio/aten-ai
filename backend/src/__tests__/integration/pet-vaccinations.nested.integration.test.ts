import request from 'supertest';
import petVaccinationsRoutes from '../../modules/pet-vaccinations/routes';
import petVaccinationService from '../../modules/pet-vaccinations/services/PetVaccinationService';
import { bearer, petTenantA, signTestToken, TENANT_A_ID, userTenantA } from '../helpers/fixtures';
import { createTestApp } from '../helpers/createTestApp';

jest.mock('../../modules/pet-vaccinations/services/PetVaccinationService', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
  }
}));

const mockedService = petVaccinationService as jest.Mocked<typeof petVaccinationService>;

describe('GET/POST /pets/:petId/vaccinations (contrato FE S5)', () => {
  const app = createTestApp(petVaccinationsRoutes);
  const token = signTestToken({
    id: userTenantA.id,
    role: 'MEMBER',
    tenantId: String(TENANT_A_ID)
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lista vacinas do pet', async () => {
    mockedService.findAll.mockResolvedValue({
      rows: [{ id: 'vacc-1', petId: petTenantA.id, name: 'V10' }],
      count: 1
    } as never);

    const response = await request(app)
      .get(`/pets/${petTenantA.id}/vaccinations`)
      .set(bearer(token))
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(mockedService.findAll).toHaveBeenCalledWith(
      TENANT_A_ID,
      { petId: petTenantA.id },
      expect.any(Object)
    );
  });

  it('cria vacina com petId do path (sem petId no body)', async () => {
    mockedService.create.mockResolvedValue({
      id: 'vacc-2',
      petId: petTenantA.id,
      name: 'V10',
      appliedAt: new Date('2026-08-05T15:00:00.000Z'),
      nextDueAt: new Date('2027-08-05T15:00:00.000Z')
    } as never);

    await request(app)
      .post(`/pets/${petTenantA.id}/vaccinations`)
      .set(bearer(token))
      .send({
        name: 'V10',
        appliedAt: '2026-08-05T15:00:00.000Z',
        nextDueAt: '2027-08-05T15:00:00.000Z'
      })
      .expect(201);

    expect(mockedService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        petId: petTenantA.id,
        name: 'V10'
      }),
      TENANT_A_ID
    );
  });
});
