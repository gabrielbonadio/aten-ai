import request from 'supertest';
import { Op } from 'sequelize';
import petsRoutes from '../../modules/pets/routes';
import Pet from '../../modules/pets/models/Pet';
import { createTestApp } from '../helpers/createTestApp';
import { bearer, petTenantB, signTestToken, TENANT_A_ID, userTenantA } from '../helpers/fixtures';

jest.mock('../../modules/pets/models/Pet', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn()
  }
}));

jest.mock('../../modules/tutors/models/Tutor', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn()
  }
}));

jest.mock('../../modules/appointments/models/Appointment', () => ({
  __esModule: true,
  default: {}
}));

jest.mock('../../modules/medical-records/models/MedicalRecord', () => ({
  __esModule: true,
  default: {}
}));

jest.mock('../../modules/auth/models/User', () => ({
  __esModule: true,
  default: {}
}));

const mockedPet = Pet as jest.Mocked<typeof Pet>;

describe('Pets API — isolamento multi-tenant (integration)', () => {
  const app = createTestApp(petsRoutes);
  const tokenTenantA = signTestToken({ id: userTenantA.id, tenantId: String(TENANT_A_ID) });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /pets/:id propaga tenantId do JWT para a consulta e retorna 404 para pet de outro tenant', async () => {
    mockedPet.findOne.mockResolvedValue(null);

    const response = await request(app)
      .get(`/pets/${petTenantB.id}`)
      .set(bearer(tokenTenantA))
      .expect(404);

    expect(response.body.message).toMatch(/pet não encontrado/i);
    expect(mockedPet.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          [Op.and]: [{ id: petTenantB.id }, { tenantId: TENANT_A_ID }]
        }
      })
    );
  });

  it('PUT /pets/:id não altera recurso quando o registro não pertence ao tenant do token', async () => {
    mockedPet.findOne.mockResolvedValue(null);

    await request(app)
      .put(`/pets/${petTenantB.id}`)
      .set(bearer(tokenTenantA))
      .send({ name: 'Tentativa de invasão' })
      .expect(404);

    expect(mockedPet.findOne).toHaveBeenCalledWith({
      where: {
        [Op.and]: [{ id: petTenantB.id }, { tenantId: TENANT_A_ID }]
      }
    });
  });

  it('rejeita requisição sem token', async () => {
    await request(app).get(`/pets/${petTenantB.id}`).expect(401);
    expect(mockedPet.findOne).not.toHaveBeenCalled();
  });
});
