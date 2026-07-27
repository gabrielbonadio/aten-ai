import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import authService from '../../../modules/auth/services/AuthService';
import userRepository from '../../../modules/auth/repositories/UserRepository';
import tenantRepository from '../../../modules/tenants/repositories/TenantRepository';
import userTokenRepository from '../../../modules/auth/repositories/UserTokenRepository';
import { encryptTotpSecret } from '../../../modules/auth/services/totpCrypto';
import { tenantA, userTenantA } from '../../helpers/fixtures';

jest.mock('../../../modules/auth/repositories/UserRepository', () => ({
  __esModule: true,
  default: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updatePasswordHash: jest.fn(),
    updateTotp: jest.fn(),
    clearTotp: jest.fn()
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
    hash: jest.fn(async (v: string) => `hash:${v}`),
    compare: jest.fn()
  }
}));

const mockedUserRepository = userRepository as jest.Mocked<typeof userRepository>;
const mockedTenantRepository = tenantRepository as jest.Mocked<typeof tenantRepository>;
const mockedUserTokenRepository = userTokenRepository as jest.Mocked<typeof userTokenRepository>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService TOTP (unit)', () => {
  const secret = authenticator.generateSecret();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUserTokenRepository.create.mockResolvedValue({ id: 'tok' } as never);
    mockedUserTokenRepository.deleteByUserIdAndPurpose.mockResolvedValue(undefined as never);
    mockedUserTokenRepository.deleteById.mockResolvedValue(undefined as never);
    mockedUserTokenRepository.findByToken.mockResolvedValue(null);
    mockedTenantRepository.findById.mockResolvedValue(tenantA as never);
  });

  it('login com 2FA ativo retorna requiresTotp sem emitir sessão', async () => {
    const user = {
      ...userTenantA,
      totpSecret: encryptTotpSecret(secret),
      totpEnabledAt: new Date()
    };
    mockedUserRepository.findByEmail.mockResolvedValue(user as never);
    mockedBcrypt.compare.mockResolvedValue(true as never);

    const result = await authService.login({
      email: user.email,
      password: 'SenhaSegura@123'
    });

    expect(result).toMatchObject({ requiresTotp: true });
    expect('pendingToken' in result && result.pendingToken.length).toBeGreaterThanOrEqual(32);
    expect(mockedTenantRepository.findById).not.toHaveBeenCalled();
    expect(mockedUserTokenRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'totp_pending', userId: user.id })
    );
  });

  it('completeTotpLogin com código válido emite AuthResponse', async () => {
    const user = {
      ...userTenantA,
      totpSecret: encryptTotpSecret(secret),
      totpEnabledAt: new Date(),
      totpRecoveryHashes: null
    };
    const pendingRaw = 'a'.repeat(64);
    mockedUserTokenRepository.findByToken.mockResolvedValue({
      id: 'pending-id',
      userId: user.id,
      expiresAt: new Date(Date.now() + 60_000)
    } as never);
    mockedUserRepository.findById.mockResolvedValue(user as never);

    const code = authenticator.generate(secret);
    const result = await authService.completeTotpLogin({ pendingToken: pendingRaw, code });

    expect(result.token).toEqual(expect.any(String));
    expect(result.user.email).toBe(user.email);
    expect(mockedUserTokenRepository.deleteById).toHaveBeenCalledWith('pending-id');
  });

  it('completeTotpLogin rejeita código inválido', async () => {
    const user = {
      ...userTenantA,
      totpSecret: encryptTotpSecret(secret),
      totpEnabledAt: new Date()
    };
    mockedUserTokenRepository.findByToken.mockResolvedValue({
      id: 'pending-id',
      userId: user.id,
      expiresAt: new Date(Date.now() + 60_000)
    } as never);
    mockedUserRepository.findById.mockResolvedValue(user as never);

    await expect(
      authService.completeTotpLogin({ pendingToken: 'b'.repeat(64), code: '000000' })
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});
