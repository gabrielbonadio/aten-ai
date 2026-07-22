import bcrypt from 'bcryptjs';
import authService from '../../../modules/auth/services/AuthService';
import userRepository from '../../../modules/auth/repositories/UserRepository';
import tenantRepository from '../../../modules/tenants/repositories/TenantRepository';
import { tenantA, userTenantA } from '../../helpers/fixtures';

jest.mock('../../../modules/auth/repositories/UserRepository', () => ({
  __esModule: true,
  default: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updatePasswordHash: jest.fn()
  }
}));

jest.mock('../../../modules/tenants/repositories/TenantRepository', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    create: jest.fn()
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
const mockedTenantRepository = tenantRepository as jest.Mocked<typeof tenantRepository>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService.login (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('autentica com credenciais válidas e retorna token + usuário + tenant', async () => {
    mockedUserRepository.findByEmail.mockResolvedValue(userTenantA as never);
    mockedBcrypt.compare.mockResolvedValue(true as never);
    mockedTenantRepository.findById.mockResolvedValue(tenantA as never);

    const result = await authService.login({
      email: userTenantA.email,
      password: 'SenhaSegura123'
    });

    expect(mockedUserRepository.findByEmail).toHaveBeenCalledWith(userTenantA.email);
    expect(mockedBcrypt.compare).toHaveBeenCalledWith('SenhaSegura123', userTenantA.password_hash);
    expect(mockedTenantRepository.findById).toHaveBeenCalledWith(userTenantA.tenantId);
    expect(result.token).toEqual(expect.any(String));
    expect(result.user).toMatchObject({
      id: userTenantA.id,
      email: userTenantA.email,
      tenantId: userTenantA.tenantId
    });
    expect(result.tenant).toEqual(tenantA);
  });

  it('rejeita senha incorreta com UnauthorizedError', async () => {
    mockedUserRepository.findByEmail.mockResolvedValue(userTenantA as never);
    mockedBcrypt.compare.mockResolvedValue(false as never);

    await expect(
      authService.login({
        email: userTenantA.email,
        password: 'senha-errada'
      })
    ).rejects.toMatchObject({ statusCode: 401, message: expect.stringMatching(/credenciais inválidas/i) });

    expect(mockedTenantRepository.findById).not.toHaveBeenCalled();
  });

  it('rejeita usuário inexistente com UnauthorizedError', async () => {
    mockedUserRepository.findByEmail.mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'inexistente@test.com',
        password: 'qualquer-senha'
      })
    ).rejects.toMatchObject({ statusCode: 401, message: expect.stringMatching(/credenciais inválidas/i) });

    expect(mockedBcrypt.compare).not.toHaveBeenCalled();
  });
});
