import bcrypt from 'bcryptjs';
import userRepository from '../../../modules/auth/repositories/UserRepository';
import userTokenRepository from '../../../modules/auth/repositories/UserTokenRepository';
import userService from '../../../modules/users/services/UserService';
import { TENANT_A_ID, userTenantA } from '../../helpers/fixtures';

jest.mock('../../../modules/auth/repositories/UserRepository', () => ({
  __esModule: true,
  default: {
    findByEmail: jest.fn(),
    findByEmailAndTenant: jest.fn(),
    findById: jest.fn(),
    findByIdAndTenant: jest.fn(),
    findAllByTenant: jest.fn(),
    countActiveAdmins: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    updatePasswordHash: jest.fn()
  }
}));

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
    compare: jest.fn()
  }
}));

const mockedUserRepository = userRepository as jest.Mocked<typeof userRepository>;
const mockedUserTokenRepository = userTokenRepository as jest.Mocked<typeof userTokenRepository>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UserService.invite (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedBcrypt.hash.mockResolvedValue('hashed-placeholder' as never);
    mockedUserTokenRepository.create.mockResolvedValue({ id: 'invite-token-id' } as never);
  });

  it('cria usuário inactive no tenant do ADMIN e token invite (happy path)', async () => {
    mockedUserRepository.findByEmailAndTenant.mockResolvedValue(null);
    mockedUserRepository.findByEmail.mockResolvedValue(null);

    const createdUser = {
      id: 'invited-user-id',
      name: 'novo',
      email: 'novo@tenant-a.com',
      role: 'MEMBER' as const,
      tenantId: TENANT_A_ID,
      active: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockedUserRepository.create.mockResolvedValue(createdUser as never);

    const result = await userService.invite({ email: 'novo@tenant-a.com' }, TENANT_A_ID);

    expect(mockedUserRepository.findByEmailAndTenant).toHaveBeenCalledWith(
      'novo@tenant-a.com',
      TENANT_A_ID
    );
    expect(mockedUserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'novo@tenant-a.com',
        role: 'MEMBER',
        tenantId: TENANT_A_ID,
        active: false,
        password_hash: 'hashed-placeholder'
      }),
      expect.any(Object)
    );
    expect(mockedUserTokenRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: createdUser.id,
        purpose: 'invite',
        token: expect.any(String),
        expiresAt: expect.any(Date)
      }),
      expect.any(Object)
    );
    expect(result).toMatchObject({
      id: createdUser.id,
      email: createdUser.email,
      active: false,
      tenantId: TENANT_A_ID
    });
  });

  it('rejeita e-mail já existente no tenant', async () => {
    mockedUserRepository.findByEmailAndTenant.mockResolvedValue(userTenantA as never);

    await expect(
      userService.invite({ email: userTenantA.email }, TENANT_A_ID)
    ).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringMatching(/e-mail já cadastrado neste tenant/i)
    });

    expect(mockedUserRepository.create).not.toHaveBeenCalled();
    expect(mockedUserTokenRepository.create).not.toHaveBeenCalled();
  });
});
