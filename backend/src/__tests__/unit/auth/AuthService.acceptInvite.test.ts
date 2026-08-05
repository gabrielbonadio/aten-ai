import bcrypt from 'bcryptjs';
import authService from '../../../modules/auth/services/AuthService';
import userRepository from '../../../modules/auth/repositories/UserRepository';
import userTokenRepository from '../../../modules/auth/repositories/UserTokenRepository';
import { TENANT_A_ID } from '../../helpers/fixtures';

jest.mock('../../../modules/auth/repositories/UserRepository', () => ({
  __esModule: true,
  default: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
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

describe('AuthService.acceptInvite (unit)', () => {
  const validToken = 'a'.repeat(64);

  beforeEach(() => {
    jest.clearAllMocks();
    mockedBcrypt.hash.mockResolvedValue('new-hash' as never);
  });

  it('ativa usuário, define senha/nome e invalida token (happy path)', async () => {
    const invitedUser = {
      id: 'invited-user-id',
      tenantId: TENANT_A_ID,
      active: false,
      email: 'novo@tenant-a.com'
    };

    mockedUserTokenRepository.findByToken.mockResolvedValue({
      id: 'token-row-id',
      userId: invitedUser.id,
      purpose: 'invite',
      expiresAt: new Date(Date.now() + 60_000)
    } as never);
    mockedUserRepository.findById.mockResolvedValue(invitedUser as never);
    mockedUserRepository.updateById.mockResolvedValue(undefined);
    mockedUserTokenRepository.deleteById.mockResolvedValue(undefined);
    mockedUserTokenRepository.deleteByUserIdAndPurpose.mockResolvedValue(undefined);

    await authService.acceptInvite({
      token: validToken,
      name: 'Novo Membro',
      password: 'SenhaSegura@123'
    });

    expect(mockedUserTokenRepository.findByToken).toHaveBeenCalledWith(validToken, 'invite');
    expect(mockedUserRepository.updateById).toHaveBeenCalledWith(
      invitedUser.id,
      {
        name: 'Novo Membro',
        password_hash: 'new-hash',
        active: true
      },
      expect.any(Object)
    );
    expect(mockedUserTokenRepository.deleteById).toHaveBeenCalledWith(
      'token-row-id',
      expect.any(Object)
    );
  });

  it('rejeita token inválido ou expirado', async () => {
    mockedUserTokenRepository.findByToken.mockResolvedValue(null);

    await expect(
      authService.acceptInvite({
        token: validToken,
        name: 'Novo Membro',
        password: 'SenhaSegura@123'
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/token inválido ou expirado/i)
    });

    expect(mockedUserRepository.updateById).not.toHaveBeenCalled();
  });
});
