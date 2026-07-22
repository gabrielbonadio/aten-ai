import { Op } from 'sequelize';
import petService from '../../../modules/pets/services/PetService';
import Pet from '../../../modules/pets/models/Pet';
import Tutor from '../../../modules/tutors/models/Tutor';
import {
  petTenantA,
  petTenantB,
  TENANT_A_ID,
  TENANT_B_ID,
  tutorTenantA
} from '../../helpers/fixtures';

jest.mock('../../../modules/pets/models/Pet', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn()
  }
}));

jest.mock('../../../modules/tutors/models/Tutor', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn()
  }
}));

const mockedPet = Pet as jest.Mocked<typeof Pet>;
const mockedTutor = Tutor as jest.Mocked<typeof Tutor>;

describe('PetService — isolamento multi-tenant (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('não permite ler pet de outro tenant (findById)', async () => {
    mockedPet.findOne.mockResolvedValue(null);

    await expect(petService.findById(petTenantB.id, TENANT_A_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/pet não encontrado/i)
    });

    expect(mockedPet.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          [Op.and]: [{ id: petTenantB.id }, { tenantId: TENANT_A_ID }]
        }
      })
    );
  });

  it('permite ler pet quando pertence ao mesmo tenant', async () => {
    mockedPet.findOne.mockResolvedValue(petTenantA as never);

    const pet = await petService.findById(petTenantA.id, TENANT_A_ID);

    expect(pet.id).toBe(petTenantA.id);
    expect(pet.tenantId).toBe(TENANT_A_ID);
  });

  it('não permite alterar pet de outro tenant (update)', async () => {
    mockedPet.findOne.mockResolvedValue(null);

    await expect(
      petService.update(petTenantB.id, { name: 'Nome Alterado' }, TENANT_A_ID)
    ).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/pet não encontrado/i)
    });

    expect(mockedPet.findOne).toHaveBeenCalledWith({
      where: {
        [Op.and]: [{ id: petTenantB.id }, { tenantId: TENANT_A_ID }]
      }
    });
  });

  it('não permite excluir pet de outro tenant (delete)', async () => {
    mockedPet.destroy.mockResolvedValue(0);

    await expect(petService.delete(petTenantB.id, TENANT_A_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/pet não encontrado/i)
    });

    expect(mockedPet.destroy).toHaveBeenCalledWith({
      where: {
        [Op.and]: [{ id: petTenantB.id }, { tenantId: TENANT_A_ID }]
      }
    });
  });

  it('não associa tutor de outro tenant na criação de pet', async () => {
    mockedTutor.findOne.mockResolvedValue(null);

    await expect(
      petService.create(
        {
          tutorId: tutorTenantA.id,
          name: 'Novo Pet'
        },
        TENANT_B_ID
      )
    ).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/tutor não encontrado/i)
    });

    expect(mockedTutor.findOne).toHaveBeenCalledWith({
      where: {
        [Op.and]: [{ id: tutorTenantA.id }, { tenantId: TENANT_B_ID }]
      }
    });
    expect(mockedPet.create).not.toHaveBeenCalled();
  });
});
